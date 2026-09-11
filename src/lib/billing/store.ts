import type { BillingDb, BillingEnvironment, BillingOrder, BillingUser, CreditPack } from './types'
import { BillingError, publicOrder } from './types'

export function ledgerTable(environment: BillingEnvironment) {
  return environment === 'live_mode' ? 'credit_transactions' : 'billing_test_credit_transactions'
}

export async function findOrder(db: BillingDb, id: string) {
  return db.prepare('SELECT * FROM billing_orders WHERE id = ?').bind(id).first<BillingOrder>()
}

export async function ownOrder(db: BillingDb, id: string, userId: string) {
  const order = await db
    .prepare('SELECT * FROM billing_orders WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<BillingOrder>()
  if (!order) throw new BillingError('order-not-found', 'Order not found.', 404)
  return order
}

export async function orderHistory(db: BillingDb, userId: string) {
  const rows = await db
    .prepare('SELECT * FROM billing_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
    .bind(userId)
    .all<BillingOrder>()
  const testBalance = await db
    .prepare(
      'SELECT COALESCE(SUM(delta), 0) AS balance FROM billing_test_credit_transactions WHERE user_id = ?',
    )
    .bind(userId)
    .first<{ balance: number }>()
  return { orders: rows.results.map(publicOrder), testCredits: Number(testBalance?.balance || 0) }
}

export async function createOrder(
  db: BillingDb,
  input: {
    user: BillingUser
    environment: BillingEnvironment
    requestId: string
    pack: CreditPack
    returnTo: string
  },
  now = Date.now(),
): Promise<{ order: BillingOrder; created: boolean }> {
  const { user, environment, requestId, pack, returnTo } = input
  const id = crypto.randomUUID()
  // Durable per-account rate limit, enforced in the same SQL statement as the insert.
  const result = await db
    .prepare(`
    INSERT INTO billing_orders
      (id, user_id, environment, request_key, pack_id, pack_name, credits, amount, currency,
       product_id, return_to, status, created_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'creating', ?, ?
    WHERE (SELECT COUNT(*) FROM billing_orders WHERE user_id = ? AND created_at > ?) < 10
    ON CONFLICT(user_id, environment, request_key) DO NOTHING
  `)
    .bind(
      id,
      user.id,
      environment,
      requestId,
      pack.id,
      pack.name,
      pack.credits,
      pack.amount,
      pack.currency,
      pack.productId,
      returnTo,
      now,
      now,
      user.id,
      now - 10 * 60_000,
    )
    .run()
  const order = await db
    .prepare(
      'SELECT * FROM billing_orders WHERE user_id = ? AND environment = ? AND request_key = ?',
    )
    .bind(user.id, environment, requestId)
    .first<BillingOrder>()
  if (!order)
    throw new BillingError(
      'rate-limited',
      'Too many checkout attempts. Try again in ten minutes.',
      429,
    )
  if (order.pack_id !== pack.id || order.return_to !== returnTo) {
    throw new BillingError(
      'checkout-conflict',
      'This checkout request already belongs to another purchase.',
      409,
    )
  }
  return { order, created: Number(result.meta.changes || 0) === 1 }
}

export async function saveCheckout(
  db: BillingDb,
  orderId: string,
  sessionId: string,
  checkoutUrl: string,
) {
  await db
    .prepare(`UPDATE billing_orders SET checkout_session_id = ?, checkout_url = ?,
    status = CASE WHEN status = 'creating' THEN 'pending' ELSE status END, updated_at = ? WHERE id = ?`)
    .bind(sessionId, checkoutUrl, Date.now(), orderId)
    .run()
}

export async function markCheckoutFailed(db: BillingDb, orderId: string) {
  await db
    .prepare(
      "UPDATE billing_orders SET status = 'checkout_failed', updated_at = ? WHERE id = ? AND status = 'creating'",
    )
    .bind(Date.now(), orderId)
    .run()
}

export async function reserveReconciliation(db: BillingDb, order: BillingOrder, now = Date.now()) {
  const result = await db
    .prepare(
      'UPDATE billing_orders SET last_reconcile_at = ? WHERE id = ? AND last_reconcile_at <= ?',
    )
    .bind(now, order.id, now - 15_000)
    .run()
  return Number(result.meta.changes || 0) === 1
}
