import type { BillingDb, BillingStatement } from '../billing/types'
import { digest, exactObject, UUID } from './http'
import {
  type ActionInput,
  type AdminAction,
  type AdminContext,
  AdminError,
  type Operation,
  type OperationResult,
  type TargetType,
} from './types'

export function parseAction(value: unknown, action: AdminAction): ActionInput {
  const obj = exactObject(value, ['requestId', 'reasonCode', 'reasonText', 'confirmedUnresolved'])
  if (typeof obj.requestId !== 'string' || !UUID.test(obj.requestId))
    throw new AdminError('invalid_request_id', 400)
  const codes =
    action === 'reconcile_order'
      ? ['user_reports_missing_credits', 'payment_event_pending', 'verification_after_fix']
      : ['system_failure', 'unresolved_timeout']
  if (typeof obj.reasonCode !== 'string' || !codes.includes(obj.reasonCode))
    throw new AdminError('invalid_reason', 400)
  if (typeof obj.reasonText !== 'string') throw new AdminError('invalid_reason', 400)
  const reasonText = obj.reasonText.trim()
  const hasDisallowedControlCharacter = [...reasonText].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 && code !== 9 && code !== 10 && code !== 13
  })
  if (reasonText.length < 5 || reasonText.length > 500 || hasDisallowedControlCharacter)
    throw new AdminError('invalid_reason', 400)
  if (obj.confirmedUnresolved !== undefined && obj.confirmedUnresolved !== true)
    throw new AdminError('invalid_confirmation', 400)
  if (obj.reasonCode === 'unresolved_timeout' && obj.confirmedUnresolved !== true)
    throw new AdminError('confirmation_required', 400)
  if (obj.reasonCode !== 'unresolved_timeout' && obj.confirmedUnresolved !== undefined)
    throw new AdminError('invalid_confirmation', 400)
  return {
    requestId: obj.requestId.toLowerCase(),
    reasonCode: obj.reasonCode,
    reasonText,
    ...(obj.confirmedUnresolved === true ? { confirmedUnresolved: true } : {}),
  }
}

export async function findOperation(db: BillingDb, id: string): Promise<Operation | null> {
  return db.prepare('SELECT * FROM admin_operations WHERE id = ?').bind(id).first<Operation>()
}
export function operationResult(op: Operation): OperationResult {
  if (op.state === 'running') return { operationId: op.id, state: 'running', outcome: 'running' }
  const value = op.result_json
    ? (JSON.parse(op.result_json) as Omit<OperationResult, 'operationId' | 'state'>)
    : { outcome: 'unknown' }
  return {
    operationId: op.id,
    state: op.state,
    outcome: value.outcome,
    ...(typeof value.returnedCredits === 'number'
      ? { returnedCredits: value.returnedCredits }
      : {}),
    ...(typeof value.currentBalance === 'number' ? { currentBalance: value.currentBalance } : {}),
    ...(typeof value.retryAfter === 'number' ? { retryAfter: value.retryAfter } : {}),
    ...(typeof value.orderId === 'string' ? { orderId: value.orderId } : {}),
  }
}
export async function beginOperation(
  context: AdminContext,
  input: ActionInput,
  action: AdminAction,
  targetType: TargetType,
  targetId: string,
  environment: Operation['environment'],
  now = Date.now(),
) {
  if (!context.config.writeEnabled) throw new AdminError('admin_read_only', 403)
  const { db, admin, traceId } = context
  const id = crypto.randomUUID()
  const leaseToken = crypto.randomUUID()
  const payloadHash = await digest(
    JSON.stringify({
      action,
      targetType,
      targetId,
      environment,
      reasonCode: input.reasonCode,
      reasonText: input.reasonText,
      confirmedUnresolved: input.confirmedUnresolved === true,
    }),
  )
  await db.batch([
    db
      .prepare(`INSERT INTO admin_operations
      (id,admin_user_id,request_id,action,target_type,target_id,environment,payload_hash,state,
       reason_code,reason_text,created_at,updated_at,lease_until,lease_token)
      SELECT ?,?,?,?,?,?,?,?,'running',?,?,?,?,?,?
      WHERE (SELECT COUNT(*) FROM admin_operations WHERE admin_user_id=? AND created_at>?)<10
        AND (SELECT COUNT(*) FROM admin_operations WHERE admin_user_id=? AND created_at>?)<120
      ON CONFLICT(admin_user_id,request_id) DO NOTHING`)
      .bind(
        id,
        admin.id,
        input.requestId,
        action,
        targetType,
        targetId,
        environment,
        payloadHash,
        input.reasonCode,
        input.reasonText,
        now,
        now,
        now + 60_000,
        leaseToken,
        admin.id,
        now - 60_000,
        admin.id,
        now - 3_600_000,
      ),
    db
      .prepare(`INSERT INTO admin_audit_logs
      (id,operation_id,actor_user_id,event_kind,target_type,target_id,environment,reason_code,reason_text,trace_id,created_at)
      SELECT ?,id,admin_user_id,'started',target_type,target_id,environment,reason_code,reason_text,?,?
      FROM admin_operations WHERE id=? ON CONFLICT(operation_id,event_kind) DO NOTHING`)
      .bind(crypto.randomUUID(), traceId, now, id),
  ])
  let operation = await db
    .prepare('SELECT * FROM admin_operations WHERE admin_user_id=? AND request_id=?')
    .bind(admin.id, input.requestId)
    .first<Operation>()
  if (!operation) throw new AdminError('rate_limited', 429, 60)
  if (operation.payload_hash !== payloadHash) throw new AdminError('request_conflict', 409)
  if (operation.id === id) return { operation, acquired: true }
  if (operation.state === 'running' && operation.lease_until <= now) {
    const result = await db
      .prepare(`UPDATE admin_operations SET lease_until=?,lease_token=?,updated_at=?
      WHERE id=? AND state='running' AND lease_until<=? AND lease_token=?`)
      .bind(now + 60_000, leaseToken, now, operation.id, now, operation.lease_token)
      .run()
    operation = (await findOperation(db, operation.id)) as Operation
    return { operation, acquired: Number(result.meta.changes) === 1 }
  }
  return { operation, acquired: false }
}

// A SELECT is deliberate: malformed JSON raises a SQLite/D1 error and rolls back
// the ENTIRE batch, including all subsequent business statements. An UPDATE with
// zero matched rows alone would not stop those statements after a lease is lost.
export function leaseGuard(db: BillingDb, op: Operation, now = Date.now()): BillingStatement {
  return db
    .prepare(`SELECT json(CASE WHEN EXISTS(SELECT 1 FROM admin_operations
    WHERE id=? AND lease_token=? AND state='running' AND lease_until>?)
    THEN 'null' ELSE 'admin_lease_lost' END) AS lease_guard`)
    .bind(op.id, op.lease_token, now)
}
export function terminalAudit(
  db: BillingDb,
  op: Operation,
  traceId: string,
  now = Date.now(),
): BillingStatement {
  return db
    .prepare(`INSERT INTO admin_audit_logs
    (id,operation_id,actor_user_id,event_kind,target_type,target_id,environment,reason_code,reason_text,
     before_json,after_json,result_code,trace_id,created_at)
    SELECT ?,o.id,o.admin_user_id,o.state,o.target_type,o.target_id,o.environment,o.reason_code,o.reason_text,
      json_extract(o.result_json,'$.before'),o.result_json,json_extract(o.result_json,'$.outcome'),?,?
    FROM admin_operations o WHERE o.id=? AND o.lease_token=? AND o.state!='running'
    ON CONFLICT(operation_id,event_kind) DO NOTHING`)
    .bind(crypto.randomUUID(), traceId, now, op.id, op.lease_token)
}
export function finishStatements(
  db: BillingDb,
  op: Operation,
  traceId: string,
  state: Exclude<Operation['state'], 'running'>,
  result: Record<string, unknown>,
  now = Date.now(),
) {
  return [
    db
      .prepare(`UPDATE admin_operations SET state=?,result_json=?,updated_at=?,completed_at=?
    WHERE id=? AND lease_token=? AND state='running'`)
      .bind(state, JSON.stringify(result), now, now, op.id, op.lease_token),
    terminalAudit(db, op, traceId, now),
  ]
}
export async function finishOperation(
  context: AdminContext,
  op: Operation,
  state: Exclude<Operation['state'], 'running'>,
  result: Record<string, unknown>,
  now = Date.now(),
) {
  await context.db.batch([
    leaseGuard(context.db, op, now),
    ...finishStatements(context.db, op, context.traceId, state, result, now),
  ])
  return operationResult((await findOperation(context.db, op.id)) as Operation)
}
