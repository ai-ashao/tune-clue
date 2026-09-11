import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'

export async function module(name) {
  return import(pathToFileURL(join(process.env.TUNECLUE_BILLING_BUILD, `${name}.mjs`)))
}
export class SqliteD1 {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:')
    this.sqlite.exec(
      readFileSync(
        process.env.TUNECLUE_BASE_MIGRATION || 'migrations/0001_auth_credits.sql',
        'utf8',
      ),
    )
    this.sqlite.exec(readFileSync('migrations/0002_dodo_billing.sql', 'utf8'))
    this.failBatchAt = -1
  }
  prepare(sql) {
    return new Statement(this, sql)
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN')
    try {
      const results = statements.map((statement, index) => {
        if (index === this.failBatchAt) throw new Error('Injected transactional failure')
        return { meta: { changes: Number(statement.compiled().run(...statement.values).changes) } }
      })
      this.sqlite.exec('COMMIT')
      return results
    } catch (error) {
      this.sqlite.exec('ROLLBACK')
      throw error
    }
  }
}
class Statement {
  constructor(db, sql, values = []) {
    this.db = db
    this.sql = sql
    this.values = values
  }
  bind(...values) {
    return new Statement(this.db, this.sql, values)
  }
  compiled() {
    return this.db.sqlite.prepare(this.sql)
  }
  async first() {
    return this.compiled().get(...this.values) ?? null
  }
  async all() {
    return { results: this.compiled().all(...this.values) }
  }
  async run() {
    return { meta: { changes: Number(this.compiled().run(...this.values).changes) } }
  }
}
export const user = { id: 'user_alice', email: 'alice@example.invalid', name: 'Alice' }
export const secondUser = { id: 'user_bob', email: 'bob@example.invalid' }
export const pack = {
  id: 'small',
  name: 'Test pack',
  credits: 20,
  amount: 499,
  currency: 'USD',
  productId: 'pdt_test',
}
export function config(environment = 'live_mode') {
  return {
    enabled: true,
    liveApproved: true,
    environment,
    siteUrl: 'https://tuneclue.com',
    apiKey: 'fixture-not-a-real-key',
    webhookKey: 'fixture-not-a-real-signing-key',
    businessId: 'biz_test',
    packs: [pack],
  }
}
export class FakeProvider {
  payments = new Map()
  sessions = new Map()
  creates = 0
  retrieves = 0
  async validateProduct() {}
  async createCheckout(order) {
    this.creates++
    const sessionId = `cks_${order.id}`
    this.sessions.set(sessionId, { id: sessionId })
    return { sessionId, checkoutUrl: `https://checkout.dodopayments.com/${sessionId}` }
  }
  async retrievePayment(id) {
    this.retrieves++
    if (!this.payments.has(id)) throw new Error('Provider temporarily unavailable')
    return structuredClone(this.payments.get(id))
  }
  async retrieveCheckout(id) {
    if (!this.sessions.has(id)) throw new Error('Unknown session')
    return structuredClone(this.sessions.get(id))
  }
}
export async function setup(environment = 'live_mode') {
  const db = new SqliteD1()
  for (const value of [user, secondUser]) {
    await db
      .prepare('INSERT INTO users (id,google_sub,email,created_at,updated_at) VALUES (?,?,?,?,?)')
      .bind(value.id, value.id, value.email, 1, 1)
      .run()
  }
  await db
    .prepare(
      "INSERT INTO credit_transactions (id,user_id,delta,type,idempotency_key,created_at) VALUES ('welcome',?,1,'welcome_bonus','welcome',1)",
    )
    .bind(user.id)
    .run()
  const context = { db, config: config(environment), provider: new FakeProvider() }
  const { startCheckout } = await module('service')
  const input = { packId: pack.id, requestId: crypto.randomUUID(), returnTo: '/account' }
  const checkout = await startCheckout(context, user, input)
  const { findOrder } = await module('store')
  const order = await findOrder(db, checkout.order.id)
  const payment = paymentFor(order)
  context.provider.payments.set(payment.payment_id, payment)
  context.provider.sessions.set(order.checkout_session_id, {
    id: order.checkout_session_id,
    payment_id: payment.payment_id,
  })
  return { context, order, payment, input }
}
export function paymentFor(order) {
  return {
    business_id: 'biz_test',
    payment_id: `pay_${order.id}`,
    checkout_session_id: order.checkout_session_id,
    status: 'succeeded',
    currency: 'USD',
    total_amount: 549,
    tax: 50,
    product_cart: [{ product_id: order.product_id, quantity: 1 }],
    refunds: [],
    disputes: [],
    metadata: {
      app: 'tuneclue',
      order_id: order.id,
      user_id: order.user_id,
      pack_id: order.pack_id,
      environment: order.environment,
    },
  }
}
export function event(payment, type = 'payment.succeeded', extra = {}) {
  return {
    id: `msg_${crypto.randomUUID()}`,
    type,
    occurredAt: Date.now(),
    data: { payment_id: payment.payment_id, ...extra },
  }
}
export function refund(payment, amount, id = `ref_${crypto.randomUUID()}`) {
  return {
    refund_id: id,
    payment_id: payment.payment_id,
    business_id: payment.business_id,
    currency: payment.currency,
    amount,
    status: 'succeeded',
  }
}
export function dispute(payment, status, id = 'disp_one') {
  return {
    dispute_id: id,
    payment_id: payment.payment_id,
    business_id: payment.business_id,
    dispute_status: status,
  }
}
export async function balance(context, environment = context.config.environment) {
  const table =
    environment === 'live_mode' ? 'credit_transactions' : 'billing_test_credit_transactions'
  const result = await context.db
    .prepare(`SELECT COALESCE(SUM(delta),0) AS balance FROM ${table} WHERE user_id = ?`)
    .bind(user.id)
    .first()
  return result.balance
}
