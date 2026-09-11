import type { BillingDb, BillingStatement } from '../billing/types'

export type RefundMode = 'automatic' | 'system_failure' | 'unresolved_timeout'
export const MANUAL_UNKNOWN_WAIT_MS = 15 * 60_000
export function refundEligibility(
  a: {
    status: string
    execution_deadline_at: number
    created_at: number
    charged: number
    returned: number
  },
  now = Date.now(),
) {
  if (a.returned >= a.charged && a.charged > 0)
    return { allowed: false, needsConfirmation: false, reason: 'already_returned' }
  if (a.charged !== 1) return { allowed: false, needsConfirmation: false, reason: 'no_valid_debit' }
  if (a.status === 'system_error')
    return { allowed: true, needsConfirmation: false, reason: 'system_failure' }
  if (
    ['running', 'indeterminate'].includes(a.status) &&
    a.execution_deadline_at < now &&
    a.created_at <= now - MANUAL_UNKNOWN_WAIT_MS
  ) {
    return { allowed: true, needsConfirmation: true, reason: 'unresolved_timeout' }
  }
  return {
    allowed: false,
    needsConfirmation: false,
    reason: ['matched', 'no_match'].includes(a.status) ? 'completed_normally' : 'not_eligible_yet',
  }
}
export function refundStatement(
  db: BillingDb,
  userId: string,
  attemptId: string,
  refundId: string,
  mode: RefundMode,
  now = Date.now(),
): BillingStatement {
  // The status and debit are re-evaluated at INSERT time, not trusted from a UI
  // eligibility response. Automatic and manual paths share refund:{attemptId}.
  return db
    .prepare(`INSERT INTO credit_transactions (id,user_id,delta,type,reference_id,idempotency_key,created_at)
    SELECT ?,a.user_id,-d.delta,'refund',a.id,'refund:'||a.id,?
    FROM recognition_attempts a JOIN credit_transactions d
      ON d.idempotency_key='recognition:'||a.id AND d.user_id=a.user_id
      AND d.reference_id=a.id AND d.type='recognition' AND d.delta=-1
    WHERE a.id=? AND a.user_id=?
      AND ((? IN ('automatic','system_failure') AND a.status='system_error')
        OR (?='unresolved_timeout' AND a.status IN ('running','indeterminate')
          AND a.execution_deadline_at<? AND a.created_at<=?))
      AND COALESCE((SELECT SUM(delta) FROM credit_transactions r
        WHERE r.user_id=a.user_id AND r.reference_id=a.id AND r.type='refund'),0)=0
    ON CONFLICT(idempotency_key) DO NOTHING`)
    .bind(refundId, now, attemptId, userId, mode, mode, now, now - MANUAL_UNKNOWN_WAIT_MS)
}
export function refundResolutionStatement(
  db: BillingDb,
  userId: string,
  attemptId: string,
  refundId: string,
  manual: boolean,
  now = Date.now(),
): BillingStatement {
  return db
    .prepare(`UPDATE recognition_attempts SET resolution=?,updated_at=?,
    status=CASE WHEN status='running' THEN 'indeterminate' ELSE status END
    WHERE id=? AND user_id=? AND EXISTS(SELECT 1 FROM credit_transactions
      WHERE id=? AND user_id=? AND reference_id=? AND idempotency_key=? AND type='refund' AND delta=1)`)
    .bind(
      manual ? 'manual_credit_return' : 'auto_credit_return',
      now,
      attemptId,
      userId,
      refundId,
      userId,
      attemptId,
      `refund:${attemptId}`,
    )
}
export async function returnAutomaticCredit(
  db: BillingDb,
  userId: string,
  attemptId: string,
  now = Date.now(),
) {
  const refundId = crypto.randomUUID()
  await db.batch([
    refundStatement(db, userId, attemptId, refundId, 'automatic', now),
    refundResolutionStatement(db, userId, attemptId, refundId, false, now),
  ])
  const row = await db
    .prepare(
      "SELECT id FROM credit_transactions WHERE user_id=? AND idempotency_key=? AND type='refund' AND delta=1",
    )
    .bind(userId, `refund:${attemptId}`)
    .first<{ id: string }>()
  return { returned: row?.id === refundId, alreadyReturned: Boolean(row && row.id !== refundId) }
}
