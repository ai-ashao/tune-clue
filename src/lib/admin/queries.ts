import type { BillingDb } from '../billing/types'
import { refundEligibility } from '../recognition/safe-refund'
import { exactObject, id } from './http'
import {
  AdminError,
  type AuditView,
  type CreditView,
  type Environment,
  type EventView,
  type OrderView,
  type Overview,
  type Page,
  type RecognitionView,
  type UserView,
} from './types'

export type ListFilter = {
  limit: number
  cursor?: string
  q?: string
  userId?: string
  status?: string
  environment?: Environment
  source?: string
  returned?: string
  issue?: string
  from?: number
  to?: number
  orderId?: string
  confirmed?: string
}
const ORDER_COLUMNS =
  'id,user_id,environment,pack_name,credits,amount,currency,status,checkout_session_id,payment_id,paid_amount,refunded_amount,target_credits,created_at,updated_at,paid_at,last_reconcile_at,review_reason'
const net = (alias: string) => `CASE WHEN ${alias}.environment='live_mode' THEN
  (SELECT COALESCE(SUM(delta),0) FROM credit_transactions l WHERE l.user_id=${alias}.user_id AND l.reference_id=${alias}.id AND l.idempotency_key LIKE 'dodo:%') ELSE
  (SELECT COALESCE(SUM(delta),0) FROM billing_test_credit_transactions l WHERE l.user_id=${alias}.user_id AND l.reference_id=${alias}.id AND l.idempotency_key LIKE 'dodo:%') END`
const ORDER_CTE = `WITH orders AS (SELECT ${ORDER_COLUMNS.split(',')
  .map((c) => `b.${c}`)
  .join(',')}, ${net('b')} AS ledger_net FROM billing_orders b)`
const inconsistent = `(o.ledger_net != CASE WHEN o.paid_at IS NULL THEN 0 ELSE o.target_credits END)`
const consistency = (o: Omit<OrderView, 'consistency'>): OrderView => ({
  ...o,
  consistency:
    o.paid_at === null
      ? o.ledger_net === 0
        ? 'not_granted'
        : 'unexpected'
      : o.ledger_net === o.target_credits
        ? 'consistent'
        : o.ledger_net < o.target_credits
          ? 'missing'
          : 'excess',
})

export function encodeCursor(time: number, key: string) {
  return btoa(JSON.stringify([time, key]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
export function decodeCursor(value: string): [number, string] {
  try {
    if (value.length > 700 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error()
    const [time, key, ...extra] = JSON.parse(
      atob(value.replace(/-/g, '+').replace(/_/g, '/')),
    ) as unknown[]
    if (
      extra.length ||
      typeof time !== 'number' ||
      !Number.isSafeInteger(time) ||
      time < 0 ||
      typeof key !== 'string' ||
      key.length > 256 ||
      !key
    )
      throw new Error()
    return [time, key]
  } catch {
    throw new AdminError('invalid_cursor', 400)
  }
}
export function parseFilter(value: unknown): ListFilter {
  const input = exactObject(value, [
    'limit',
    'cursor',
    'q',
    'userId',
    'status',
    'environment',
    'source',
    'returned',
    'issue',
    'from',
    'to',
    'orderId',
    'confirmed',
  ])
  const limit = input.limit === undefined || input.limit === '' ? 30 : Number(input.limit)
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new AdminError('invalid_limit', 400)
  const result: ListFilter = { limit }
  for (const key of [
    'cursor',
    'q',
    'userId',
    'status',
    'environment',
    'source',
    'returned',
    'issue',
    'orderId',
    'confirmed',
  ] as const) {
    if (input[key] === undefined || input[key] === '') continue
    if (typeof input[key] !== 'string' || input[key].length > (key === 'cursor' ? 700 : 320))
      throw new AdminError('invalid_filter', 400)
    const text = input[key].trim()
    if (key === 'environment') {
      if (!['test_mode', 'live_mode', 'all'].includes(text))
        throw new AdminError('invalid_filter', 400)
      result.environment = text as Environment
    } else result[key] = text
  }
  for (const key of ['from', 'to'] as const) {
    if (input[key] === undefined || input[key] === '') continue
    const time = Number(input[key])
    if (!Number.isSafeInteger(time) || time < 0 || time > 8_640_000_000_000_000)
      throw new AdminError('invalid_time', 400)
    result[key] = time
  }
  if (result.from !== undefined && result.to !== undefined && result.from >= result.to)
    throw new AdminError('invalid_time', 400)
  if (result.userId) id(result.userId)
  if (result.orderId) id(result.orderId)
  if (result.cursor) decodeCursor(result.cursor)
  return result
}
export function queryObject(search: URLSearchParams) {
  const obj: Record<string, string> = {}
  for (const [key, value] of search) {
    if (Object.hasOwn(obj, key)) throw new AdminError('duplicate_parameter', 400)
    obj[key] = value
  }
  return obj
}
function pagination(
  filter: ListFilter,
  time: string,
  key: string,
  parts: string[],
  values: unknown[],
) {
  if (filter.from !== undefined) {
    parts.push(`${time}>=?`)
    values.push(filter.from)
  }
  if (filter.to !== undefined) {
    parts.push(`${time}<?`)
    values.push(filter.to)
  }
  if (filter.cursor) {
    const [t, k] = decodeCursor(filter.cursor)
    parts.push(`(${time}<? OR (${time}=? AND ${key}<?))`)
    values.push(t, t, k)
  }
}
function page<T>(rows: T[], limit: number, getPosition: (row: T) => [number, string]): Page<T> {
  const more = rows.length > limit
  const items = rows.slice(0, limit)
  return {
    items,
    nextCursor: more && items.length ? encodeCursor(...getPosition(items[items.length - 1])) : null,
  }
}
export async function requireAdminSchema(db: BillingDb) {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('recognition_attempts','admin_operations','admin_audit_logs','billing_orders','billing_events','billing_refunds','billing_disputes','billing_test_credit_transactions')",
    )
    .first<{ n: number }>()
  if (Number(row?.n) !== 8) throw new AdminError('admin_schema_unavailable', 503)
}
export async function searchUsers(db: BillingDb, value: unknown) {
  const input = exactObject(value, ['q', 'limit', 'cursor', 'from', 'to'])
  const f = parseFilter(input)
  const conditions = ['1=1']
  const values: unknown[] = []
  if (f.q) {
    if (f.q.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.q)) throw new AdminError('invalid_email', 400)
      conditions.push('u.email=? COLLATE NOCASE')
      values.push(f.q)
    } else {
      conditions.push('u.id=?')
      values.push(id(f.q))
    }
  }
  pagination(f, 'u.created_at', 'u.id', conditions, values)
  const rows = await db
    .prepare(`WITH selected AS (SELECT u.id,u.email,u.name,u.created_at FROM users u WHERE ${conditions.join(' AND ')} ORDER BY u.created_at DESC,u.id DESC LIMIT ?),
    credits AS (SELECT user_id,SUM(delta) balance FROM credit_transactions WHERE user_id IN (SELECT id FROM selected) GROUP BY user_id),
    tests AS (SELECT user_id,SUM(delta) balance FROM billing_test_credit_transactions WHERE user_id IN (SELECT id FROM selected) GROUP BY user_id),
    activity AS (SELECT user_id,MAX(created_at) recent FROM recognition_attempts WHERE user_id IN (SELECT id FROM selected) GROUP BY user_id)
    SELECT s.*,COALESCE(c.balance,0) balance,COALESCE(t.balance,0) test_balance,a.recent last_recognition_at
    FROM selected s LEFT JOIN credits c ON c.user_id=s.id LEFT JOIN tests t ON t.user_id=s.id LEFT JOIN activity a ON a.user_id=s.id
    ORDER BY s.created_at DESC,s.id DESC`)
    .bind(...values, f.limit + 1)
    .all<UserView>()
  return page(rows.results, f.limit, (r) => [r.created_at, r.id])
}
export async function userDetail(db: BillingDb, userId: string) {
  const result = await searchUsers(db, { q: userId, limit: 1 })
  const user = result.items[0]
  if (!user) throw new AdminError('resource_not_found', 404)
  const legacy = await db
    .prepare(`SELECT COUNT(*) n FROM credit_transactions c WHERE c.user_id=? AND c.type='recognition'
    AND NOT EXISTS(SELECT 1 FROM recognition_attempts a WHERE a.id=c.reference_id AND a.user_id=c.user_id)`)
    .bind(userId)
    .first<{ n: number }>()
  return { ...user, legacy_attempts: Number(legacy?.n || 0) }
}
export async function userCredits(
  db: BillingDb,
  userId: string,
  ledger: string,
  filter: ListFilter,
) {
  if (!['spendable', 'test'].includes(ledger)) throw new AdminError('invalid_ledger', 400)
  const table = ledger === 'spendable' ? 'credit_transactions' : 'billing_test_credit_transactions'
  const parts = ['c.user_id=?']
  const values: unknown[] = [userId]
  pagination(filter, 'c.created_at', 'c.id', parts, values)
  const rows = await db
    .prepare(`SELECT c.id,c.user_id,c.delta,c.type,c.reference_id,c.idempotency_key,c.created_at,
    EXISTS(SELECT 1 FROM recognition_attempts a WHERE a.id=c.reference_id AND a.user_id=c.user_id) has_attempt
    FROM ${table} c WHERE ${parts.join(' AND ')} ORDER BY c.created_at DESC,c.id DESC LIMIT ?`)
    .bind(...values, filter.limit + 1)
    .all<CreditView>()
  return page(rows.results, filter.limit, (r) => [r.created_at, r.id])
}
export async function listOrders(db: BillingDb, f: ListFilter) {
  const parts = ['1=1']
  const values: unknown[] = []
  const env = f.environment || 'live_mode'
  if (env !== 'all') {
    parts.push('o.environment=?')
    values.push(env)
  }
  if (f.q) {
    const q = id(f.q)
    parts.push('(o.id=? OR o.payment_id=? OR o.checkout_session_id=? OR o.user_id=?)')
    values.push(q, q, q, q)
  }
  if (f.userId) {
    parts.push('o.user_id=?')
    values.push(f.userId)
  }
  if (f.status) {
    if (
      ![
        'creating',
        'pending',
        'checkout_failed',
        'failed',
        'cancelled',
        'paid',
        'partially_refunded',
        'refunded',
        'disputed',
        'review',
      ].includes(f.status)
    )
      throw new AdminError('invalid_status', 400)
    parts.push('o.status=?')
    values.push(f.status)
  }
  if (f.issue) {
    if (f.issue === 'review') parts.push("o.status='review'")
    else if (f.issue === 'entitlement') parts.push(inconsistent)
    else if (f.issue === 'active')
      parts.push(
        `(o.status IN ('review','checkout_failed') OR (o.status='creating' AND o.created_at<${Date.now() - 120000}) OR ${inconsistent})`,
      )
    else throw new AdminError('invalid_filter', 400)
  }
  if (f.confirmed && f.confirmed !== 'yes') throw new AdminError('invalid_filter', 400)
  if (f.confirmed) {
    parts.push('o.paid_at IS NOT NULL')
    if (f.from !== undefined) {
      parts.push('o.paid_at>=?')
      values.push(f.from)
    }
    if (f.to !== undefined) {
      parts.push('o.paid_at<?')
      values.push(f.to)
    }
  }
  pagination(
    f.confirmed ? { ...f, from: undefined, to: undefined } : f,
    'o.created_at',
    'o.id',
    parts,
    values,
  )
  const rows = await db
    .prepare(
      `${ORDER_CTE} SELECT * FROM orders o WHERE ${parts.join(' AND ')} ORDER BY o.created_at DESC,o.id DESC LIMIT ?`,
    )
    .bind(...values, f.limit + 1)
    .all<Omit<OrderView, 'consistency'>>()
  return page(rows.results.map(consistency), f.limit, (r) => [r.created_at, r.id])
}
export async function orderDetail(db: BillingDb, orderId: string) {
  const row = await db
    .prepare(`${ORDER_CTE} SELECT o.*,
    (SELECT COALESCE(SUM(delta),0) FROM credit_transactions WHERE user_id=o.user_id) user_balance
    FROM orders o WHERE o.id=?`)
    .bind(orderId)
    .first<Omit<OrderView, 'consistency'>>()
  if (!row) throw new AdminError('resource_not_found', 404)
  return consistency(row)
}
// Covering a historical review does not rewrite that event. Timestamp ties are
// intentionally conservative: uncertain ordering stays active for review.
const COVERING = `(SELECT p.event_id FROM billing_events p JOIN orders o ON o.id=e.order_id
  WHERE p.order_id=e.order_id AND p.environment=e.environment AND p.state='processed'
    AND p.processed_at>e.received_at AND o.status!='review'
    AND o.ledger_net=CASE WHEN o.paid_at IS NULL THEN 0 ELSE o.target_credits END
    AND NOT EXISTS(SELECT 1 FROM billing_events newer WHERE newer.order_id=e.order_id
      AND newer.environment=e.environment AND newer.state IN ('pending','review') AND newer.received_at>=p.processed_at)
  ORDER BY p.processed_at DESC,p.event_id DESC LIMIT 1)`
const EVENT_CTE = `${ORDER_CTE}, event_views AS (SELECT e.environment,e.event_id,e.event_type,e.order_id,e.state,e.received_at,e.processed_at,e.reason,
  CASE WHEN e.state IN ('pending','review') THEN ${COVERING} ELSE NULL END covering_event_id FROM billing_events e),
  event_details AS (SELECT e.*,CASE WHEN e.state IN ('pending','review') AND e.covering_event_id IS NULL THEN 1 ELSE 0 END active,
    (SELECT processed_at FROM billing_events p WHERE p.environment=e.environment AND p.event_id=e.covering_event_id) covered_at
    FROM event_views e)`
export async function listEvents(db: BillingDb, f: ListFilter) {
  const parts = ['1=1']
  const values: unknown[] = []
  if (f.environment && f.environment !== 'all') {
    parts.push('e.environment=?')
    values.push(f.environment)
  }
  if (f.orderId) {
    parts.push('e.order_id=?')
    values.push(f.orderId)
  }
  if (f.issue === 'active') parts.push('e.active=1')
  else if (f.issue) throw new AdminError('invalid_filter', 400)
  if (f.q) {
    const q = id(f.q)
    parts.push('(e.event_id=? OR e.order_id=?)')
    values.push(q, q)
  }
  pagination(f, 'e.received_at', "(e.environment||':'||e.event_id)", parts, values)
  const rows = await db
    .prepare(`${EVENT_CTE} SELECT * FROM event_details e WHERE ${parts.join(' AND ')}
    ORDER BY e.received_at DESC,(e.environment||':'||e.event_id) DESC LIMIT ?`)
    .bind(...values, f.limit + 1)
    .all<EventView>()
  return page(rows.results, f.limit, (r) => [r.received_at, `${r.environment}:${r.event_id}`])
}
export async function orderRelated(
  db: BillingDb,
  orderId: string,
  kind: 'refunds' | 'disputes',
  f: ListFilter,
) {
  const table = kind === 'refunds' ? 'billing_refunds' : 'billing_disputes'
  const key = kind === 'refunds' ? 'refund_id' : 'dispute_id'
  const parts = ['order_id=?']
  const values: unknown[] = [orderId]
  if (f.cursor) {
    parts.push(`${key}<?`)
    values.push(decodeCursor(f.cursor)[1])
  }
  const rows = await db
    .prepare(`SELECT * FROM ${table} WHERE ${parts.join(' AND ')} ORDER BY ${key} DESC LIMIT ?`)
    .bind(...values, f.limit + 1)
    .all<Record<string, string | number>>()
  // Refunds have no timestamp in the existing schema. Pagination is by resource ID,
  // not an invented "refund time". The UI labels this order explicitly.
  return page(rows.results, f.limit, (r) => [0, String(r[key])])
}
const RECOGNITION_BASE = `SELECT a.id,a.user_id,a.source_kind,a.status,a.stage,a.provider,a.provider_call_count,
  a.estimated_unit_cost_microusd,a.error_code,a.duration_ms,a.resolution,a.created_at,a.updated_at,
  a.execution_deadline_at,a.finished_at,
  CASE WHEN a.status='running' AND a.execution_deadline_at<? THEN 'indeterminate' ELSE a.status END effective_status,
  (SELECT COALESCE(-SUM(delta),0) FROM credit_transactions d WHERE d.user_id=a.user_id AND d.reference_id=a.id AND d.idempotency_key='recognition:'||a.id AND d.type='recognition') charged,
  (SELECT COALESCE(SUM(delta),0) FROM credit_transactions r WHERE r.user_id=a.user_id AND r.reference_id=a.id AND r.type='refund') returned
  FROM recognition_attempts a`
const REC_ISSUE = `(r.charged=1 AND r.returned=0 AND (r.status='system_error' OR
  (r.effective_status='indeterminate' AND r.execution_deadline_at<? AND r.created_at<=?)))`
export async function listRecognitions(db: BillingDb, f: ListFilter, now = Date.now()) {
  const parts = ['1=1']
  const values: unknown[] = [now]
  if (f.q) {
    const q = id(f.q)
    parts.push('(r.id=? OR r.user_id=?)')
    values.push(q, q)
  }
  if (f.userId) {
    parts.push('r.user_id=?')
    values.push(f.userId)
  }
  if (f.status) {
    if (f.status === 'accepted') parts.push("r.status!='rejected'")
    else {
      if (
        !['running', 'matched', 'no_match', 'system_error', 'indeterminate', 'rejected'].includes(
          f.status,
        )
      )
        throw new AdminError('invalid_status', 400)
      parts.push('r.effective_status=?')
      values.push(f.status)
    }
  }
  if (f.source) {
    if (!['local_file', 'tiktok_url'].includes(f.source))
      throw new AdminError('invalid_filter', 400)
    parts.push('r.source_kind=?')
    values.push(f.source)
  }
  if (f.returned) {
    if (f.returned === 'yes') parts.push('r.returned>0')
    else if (f.returned === 'no') parts.push('r.returned=0')
    else throw new AdminError('invalid_filter', 400)
  }
  if (f.issue) {
    if (f.issue !== 'active') throw new AdminError('invalid_filter', 400)
    parts.push(REC_ISSUE)
    values.push(now, now - 900_000)
  }
  pagination(f, 'r.created_at', 'r.id', parts, values)
  const rows = await db
    .prepare(
      `WITH rec AS (${RECOGNITION_BASE}) SELECT * FROM rec r WHERE ${parts.join(' AND ')} ORDER BY r.created_at DESC,r.id DESC LIMIT ?`,
    )
    .bind(...values, f.limit + 1)
    .all<RecognitionView>()
  return page(rows.results, f.limit, (r) => [r.created_at, r.id])
}
export async function recognitionDetail(db: BillingDb, attemptId: string, now = Date.now()) {
  const row = await db
    .prepare(`WITH rec AS (${RECOGNITION_BASE}) SELECT * FROM rec WHERE id=?`)
    .bind(now, attemptId)
    .first<RecognitionView>()
  if (!row) throw new AdminError('resource_not_found', 404)
  return { ...row, eligibility: refundEligibility(row, now) }
}
export async function listAudit(
  db: BillingDb,
  targetType: string,
  targetId: string,
  f: ListFilter,
) {
  if (!['order', 'recognition'].includes(targetType)) throw new AdminError('invalid_target', 400)
  const parts = ['a.target_type=?', 'a.target_id=?']
  const values: unknown[] = [targetType, id(targetId)]
  pagination(f, 'a.created_at', 'a.id', parts, values)
  const rows = await db
    .prepare(
      `SELECT * FROM admin_audit_logs a WHERE ${parts.join(' AND ')} ORDER BY a.created_at DESC,a.id DESC LIMIT ?`,
    )
    .bind(...values, f.limit + 1)
    .all<AuditView>()
  return page(rows.results, f.limit, (r) => [r.created_at, r.id])
}
export async function overview(db: BillingDb, range = '7d', now = Date.now()): Promise<Overview> {
  if (!['today', '7d', '30d'].includes(range)) throw new AdminError('invalid_range', 400)
  const day = new Date(now)
  const today = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
  const from = today - (range === 'today' ? 0 : range === '7d' ? 6 : 29) * 86_400_000
  const to = today + 86_400_000
  const count = async (sql: string, values: unknown[] = []) =>
    Number(
      (
        await db
          .prepare(sql)
          .bind(...values)
          .first<{ n: number }>()
      )?.n || 0,
    )
  const [
    newUsers,
    confirmedLiveOrders,
    recorded,
    recognitions,
    orders,
    events,
    entitlements,
    recIssues,
  ] = await Promise.all([
    count('SELECT COUNT(*) n FROM users WHERE created_at>=? AND created_at<?', [from, to]),
    count(
      "SELECT COUNT(*) n FROM billing_orders WHERE environment='live_mode' AND paid_at>=? AND paid_at<?",
      [from, to],
    ),
    count('SELECT COUNT(*) n FROM recognition_attempts'),
    count(
      "SELECT COUNT(*) n FROM recognition_attempts WHERE status!='rejected' AND created_at>=? AND created_at<?",
      [from, to],
    ),
    count(
      `${ORDER_CTE} SELECT COUNT(*) n FROM orders o WHERE o.status IN ('review','checkout_failed') OR (o.status='creating' AND o.created_at<?)`,
      [now - 120_000],
    ),
    count(`${EVENT_CTE} SELECT COUNT(*) n FROM event_details WHERE active=1`),
    count(`${ORDER_CTE} SELECT COUNT(*) n FROM orders o WHERE ${inconsistent}`),
    count(`WITH rec AS (${RECOGNITION_BASE}) SELECT COUNT(*) n FROM rec r WHERE ${REC_ISSUE}`, [
      now,
      now,
      now - 900_000,
    ]),
  ])
  const openIssues = await count(
    `${EVENT_CTE}, rec AS (${RECOGNITION_BASE}), issues AS (
    SELECT 'order:'||o.id k FROM orders o WHERE o.status IN ('review','checkout_failed') OR (o.status='creating' AND o.created_at<?) OR ${inconsistent}
    UNION SELECT CASE WHEN e.order_id IS NULL THEN 'event:'||e.environment||':'||e.event_id ELSE 'order:'||e.order_id END FROM event_details e WHERE active=1
    UNION SELECT 'rec:'||r.id FROM rec r WHERE ${REC_ISSUE}) SELECT COUNT(*) n FROM issues`,
    [now, now - 120_000, now, now - 900_000],
  )
  const quality = recorded
    ? await db
        .prepare(`SELECT
    COALESCE(SUM(status='matched'),0) matched,COALESCE(SUM(status='no_match'),0) no_match,
    COALESCE(SUM(status='system_error'),0) system_error,
    COALESCE(SUM(status='indeterminate' OR (status='running' AND execution_deadline_at<?)),0) indeterminate,
    COALESCE(SUM(status='running' AND execution_deadline_at>=?),0) running,AVG(duration_ms) average_ms
    FROM recognition_attempts WHERE created_at>=? AND created_at<? AND status!='rejected'`)
        .bind(now, now, from, to)
        .first<NonNullable<Overview['quality']>>()
    : null
  return {
    range,
    from,
    to,
    newUsers,
    confirmedLiveOrders,
    recognitions: recorded ? recognitions : null,
    openIssues,
    groups: { orders, events, entitlements, recognitions: recIssues },
    quality,
  }
}
