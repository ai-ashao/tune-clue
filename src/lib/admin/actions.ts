import { providerReady } from '../billing/config'
import type { BillingCommit } from '../billing/fulfillment'
import { type BillingContext, reconcileOrderDetailed } from '../billing/service'
import { findOrder, ledgerTable } from '../billing/store'
import type { BillingOrder } from '../billing/types'
import { refundResolutionStatement, refundStatement } from '../recognition/safe-refund'
import {
  beginOperation,
  findOperation,
  finishOperation,
  leaseGuard,
  operationResult,
  parseAction,
  terminalAudit,
} from './operations'
import { recognitionDetail } from './queries'
import { type AdminContext, AdminError, type Operation } from './types'

function netSql(table: string) {
  return `(SELECT COALESCE(SUM(delta),0) FROM ${table} l WHERE l.user_id=b.user_id AND l.reference_id=b.id AND l.idempotency_key LIKE 'dodo:%')`
}
function orderCommit(context: AdminContext, op: Operation, order: BillingOrder): BillingCommit {
  const { db, traceId } = context
  const table = ledgerTable(order.environment)
  const snapshot = `(SELECT json_object('status',b.status,'target',b.target_credits,'net',${netSql(table)},'paid',b.paid_at) FROM billing_orders b WHERE b.id=?)`
  return {
    before: () => [
      leaseGuard(db, op),
      db
        .prepare(
          `UPDATE admin_operations SET result_json=json_object('before',${snapshot}) WHERE id=? AND lease_token=?`,
        )
        .bind(order.id, op.id, op.lease_token),
    ],
    after: (hint) => {
      const fixed = [
        'review_required',
        'throttled',
        'payment_not_ready',
        'checkout_missing',
      ].includes(hint)
        ? hint
        : null
      const outcome = `(SELECT CASE WHEN b.status='review' AND ${hint === 'throttled' ? 0 : 1}=1 THEN 'review_required'
        WHEN ? IS NOT NULL THEN ? WHEN b.paid_at IS NULL THEN 'payment_not_ready'
        WHEN json_extract(admin_operations.result_json,'$.before.status')!=b.status
          OR json_extract(admin_operations.result_json,'$.before.target')!=b.target_credits
          OR json_extract(admin_operations.result_json,'$.before.net')!=${netSql(table)}
          OR json_extract(admin_operations.result_json,'$.before.paid') IS NOT b.paid_at
        THEN 'updated' ELSE 'unchanged' END FROM billing_orders b WHERE b.id=?)`
      const now = Date.now()
      return [
        db
          .prepare(`UPDATE admin_operations SET result_json=json_object('outcome',${outcome},'orderId',?,
          'before',json_extract(result_json,'$.before'),'retryAfter',?),updated_at=?,completed_at=?
          WHERE id=? AND lease_token=? AND state='running'`)
          .bind(
            fixed,
            fixed,
            order.id,
            order.id,
            hint === 'throttled' ? 15 : 0,
            now,
            now,
            op.id,
            op.lease_token,
          ),
        db
          .prepare(`UPDATE admin_operations SET state=CASE json_extract(result_json,'$.outcome')
          WHEN 'updated' THEN 'succeeded' WHEN 'review_required' THEN 'review'
          WHEN 'checkout_missing' THEN 'review' ELSE 'no_change' END WHERE id=? AND lease_token=? AND state='running'`)
          .bind(op.id, op.lease_token),
        terminalAudit(db, op, traceId, now),
      ]
    },
  }
}
export async function adminReconcile(
  context: AdminContext,
  orderId: string,
  body: unknown,
  getBilling: () => Promise<BillingContext>,
) {
  if (!context.config.writeEnabled) throw new AdminError('admin_read_only', 403)
  const input = parseAction(body, 'reconcile_order')
  const order = await findOrder(context.db, orderId)
  if (!order) throw new AdminError('resource_not_found', 404)
  const start = await beginOperation(
    context,
    input,
    'reconcile_order',
    'order',
    orderId,
    order.environment,
  )
  if (!start.acquired) return operationResult(start.operation)
  const op = start.operation
  let billing: BillingContext
  try {
    billing = await getBilling()
  } catch {
    return finishOperation(context, op, 'failed', { outcome: 'provider_unavailable', orderId })
  }
  if (billing.config.environment !== order.environment)
    return finishOperation(context, op, 'failed', { outcome: 'environment_unavailable', orderId })
  if (!providerReady(billing.config))
    return finishOperation(context, op, 'failed', { outcome: 'provider_unavailable', orderId })
  if (!order.checkout_session_id)
    return finishOperation(context, op, 'review', { outcome: 'checkout_missing', orderId })
  try {
    await reconcileOrderDetailed(billing, order.user_id, orderId, orderCommit(context, op, order))
    return operationResult((await findOperation(context.db, op.id)) as Operation)
  } catch {
    const current = await findOperation(context.db, op.id)
    // If the response was lost after a successful commit, return the committed
    // result. A stale worker may never overwrite a successor's lease or result.
    if (current?.state !== 'running' && current) return operationResult(current)
    if (!current || current.lease_token !== op.lease_token || current.lease_until <= Date.now()) {
      if (!current) throw new AdminError('operation_unavailable', 503)
      return operationResult(current)
    }
    return finishOperation(context, op, 'failed', {
      outcome: 'provider_or_commit_unavailable',
      orderId,
    })
  }
}

export async function adminReturnCredit(
  context: AdminContext,
  attemptId: string,
  body: unknown,
  now = Date.now(),
) {
  if (!context.config.writeEnabled) throw new AdminError('admin_read_only', 403)
  const input = parseAction(body, 'return_recognition_credit')
  // Existence/owner are read from the server. Eligibility is NOT trusted here:
  // refundStatement checks the latest status, debit and refund inside the batch.
  const attempt = await recognitionDetail(context.db, attemptId, now)
  const start = await beginOperation(
    context,
    input,
    'return_recognition_credit',
    'recognition',
    attemptId,
    'spendable',
    now,
  )
  if (!start.acquired) return operationResult(start.operation)
  const op = start.operation
  const { db, traceId } = context
  const refundId = crypto.randomUUID()
  const currentRefund = `EXISTS(SELECT 1 FROM credit_transactions WHERE user_id=? AND idempotency_key=? AND type='refund' AND delta=1)`
  const insertedRefund = 'EXISTS(SELECT 1 FROM credit_transactions WHERE id=?)'
  await db.batch([
    leaseGuard(db, op, now),
    db
      .prepare(
        `UPDATE admin_operations SET result_json=json_object('before',(SELECT json_object('status',status,'resolution',resolution) FROM recognition_attempts WHERE id=?)) WHERE id=?`,
      )
      .bind(attemptId, op.id),
    refundStatement(
      db,
      attempt.user_id,
      attemptId,
      refundId,
      input.reasonCode === 'unresolved_timeout' ? 'unresolved_timeout' : 'system_failure',
      now,
    ),
    refundResolutionStatement(db, attempt.user_id, attemptId, refundId, true, now),
    db
      .prepare(`UPDATE admin_operations SET
      state=CASE WHEN ${insertedRefund} THEN 'succeeded' WHEN ${currentRefund} THEN 'no_change' ELSE 'review' END,
      result_json=json_object('outcome',CASE WHEN ${insertedRefund} THEN 'returned' WHEN ${currentRefund} THEN 'already_returned' ELSE 'not_eligible' END,
        'returnedCredits',CASE WHEN ${insertedRefund} THEN 1 ELSE 0 END,
        'currentBalance',(SELECT COALESCE(SUM(delta),0) FROM credit_transactions WHERE user_id=?),
        'before',json_extract(result_json,'$.before')),
      updated_at=?,completed_at=? WHERE id=? AND lease_token=? AND state='running'`)
      .bind(
        refundId,
        attempt.user_id,
        `refund:${attemptId}`,
        refundId,
        attempt.user_id,
        `refund:${attemptId}`,
        refundId,
        attempt.user_id,
        now,
        now,
        op.id,
        op.lease_token,
      ),
    terminalAudit(db, op, traceId, now),
  ])
  return operationResult((await findOperation(db, op.id)) as Operation)
}
