import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'

export async function mod(name) {
  return import(pathToFileURL(join(process.env.TUNECLUE_ADMIN_BUILD, `${name}.mjs`)))
}
export class SqliteD1 {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:')
    for (const name of [
      '0001_auth_credits.sql',
      '0002_dodo_billing.sql',
      '0003_admin_recognition.sql',
    ])
      this.sqlite.exec(readFileSync(`migrations/${name}`, 'utf8'))
    this.failAt = -1
    this.failSql = null
    this.queries = []
  }
  prepare(sql) {
    return new Statement(this, sql)
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN IMMEDIATE')
    try {
      const result = statements.map((s, index) => {
        if (index === this.failAt || (this.failSql && s.sql.includes(this.failSql)))
          throw new Error('Injected batch failure')
        this.queries.push(s.sql)
        return { meta: { changes: Number(this.sqlite.prepare(s.sql).run(...s.values).changes) } }
      })
      this.sqlite.exec('COMMIT')
      return result
    } catch (error) {
      this.sqlite.exec('ROLLBACK')
      throw error
    }
  }
  close() {
    this.sqlite.close()
  }
}
class Statement {
  constructor(db, sql, values = []) {
    this.db = db
    this.sql = sql
    this.values = values
  }
  bind(...v) {
    return new Statement(this.db, this.sql, v)
  }
  compiled() {
    this.db.queries.push(this.sql)
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
export const admin = {
  id: 'admin_test',
  email: 'admin@example.invalid',
  name: 'Operator',
  sessionCreatedAt: Date.now(),
}
export const user = { id: 'user_test', email: 'alice@example.invalid', name: 'Alice' }
export const other = { id: 'user_other', email: 'bob@example.invalid', name: 'Bob' }
export const env = {
  ADMIN_ENABLED: 'true',
  ADMIN_WRITE_ENABLED: 'true',
  ADMIN_USER_IDS: admin.id,
  ADMIN_SITE_ORIGIN: 'https://tuneclue.com',
  DODO_PAYMENTS_ENVIRONMENT: 'live_mode',
  DODO_PAYMENTS_API_KEY: 'fixture',
  DODO_PAYMENTS_WEBHOOK_KEY: 'fixture',
  DODO_PAYMENTS_BUSINESS_ID: 'biz_test',
}
export async function setup(now = Date.now()) {
  const db = new SqliteD1()
  for (const u of [admin, user, other])
    await db
      .prepare(
        'INSERT INTO users(id,google_sub,email,name,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      )
      .bind(u.id, u.id, u.email, u.name, now, now)
      .run()
  const { parseAdminConfig } = await mod('admin/config')
  return {
    db,
    admin: { ...admin, sessionCreatedAt: now },
    config: parseAdminConfig(env),
    traceId: crypto.randomUUID(),
  }
}
export async function credit(db, userId = user.id, amount = 1, key = crypto.randomUUID()) {
  await db
    .prepare(
      "INSERT INTO credit_transactions(id,user_id,delta,type,idempotency_key,created_at) VALUES (?,?,?,'welcome_bonus',?,?)",
    )
    .bind(crypto.randomUUID(), userId, amount, key, Date.now())
    .run()
}
export async function balance(db, userId = user.id) {
  return (
    await db
      .prepare('SELECT COALESCE(SUM(delta),0) n FROM credit_transactions WHERE user_id=?')
      .bind(userId)
      .first()
  ).n
}
export async function token(
  db,
  u = admin,
  createdAt = Date.now(),
  expiresAt = Date.now() + 86400000,
) {
  const raw = crypto.randomUUID()
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))
  const hash = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  await db
    .prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)')
    .bind(hash, u.id, createdAt, expiresAt)
    .run()
  return `tuneclue_session=${raw}`
}
export function request(path, cookie, body, headers = {}) {
  return new Request(`https://tuneclue.com/api/admin/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body === undefined
        ? {}
        : {
            origin: 'https://tuneclue.com',
            'content-type': 'application/json',
            'x-tuneclue-admin-action': '1',
          }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
export function action(reasonCode = 'system_failure', overrides = {}) {
  return {
    requestId: crypto.randomUUID(),
    reasonCode,
    reasonText: '已核实本次异常，按原扣次处理。',
    ...overrides,
  }
}
export async function attempt(
  db,
  status = 'system_error',
  now = Date.now(),
  u = user,
  source = 'local_file',
) {
  const { beginAttempt, findAttempt } = await mod('recognition/attempts')
  const begun = await beginAttempt(
    db,
    { userId: u.id, requestId: crypto.randomUUID(), source, fingerprint: 'fixture_hash' },
    now,
  )
  if (status !== 'running')
    await db
      .prepare('UPDATE recognition_attempts SET status=? WHERE id=?')
      .bind(status, begun.attempt.id)
      .run()
  return findAttempt(db, begun.attempt.id)
}
export const pack = {
  id: 'starter',
  name: 'Fixture pack',
  credits: 20,
  amount: 499,
  currency: 'USD',
  productId: 'pdt_test',
}
export function billingConfig(environment = 'live_mode') {
  return {
    enabled: true,
    liveApproved: true,
    environment,
    siteUrl: 'https://tuneclue.com',
    apiKey: 'fixture',
    webhookKey: 'fixture',
    businessId: 'biz_test',
    packs: [pack],
  }
}
export class FakeProvider {
  sessions = new Map()
  payments = new Map()
  reads = 0
  creates = 0
  async validateProduct() {}
  async createCheckout(order) {
    this.creates++
    const id = `cks_${order.id}`
    this.sessions.set(id, { id })
    return { sessionId: id, checkoutUrl: `https://checkout.dodopayments.com/${id}` }
  }
  async retrieveCheckout(id) {
    this.reads++
    if (!this.sessions.has(id)) throw new Error('offline')
    return structuredClone(this.sessions.get(id))
  }
  async retrievePayment(id) {
    this.reads++
    if (!this.payments.has(id)) throw new Error('offline')
    return structuredClone(this.payments.get(id))
  }
}
export async function order(context, environment = 'live_mode') {
  const provider = new FakeProvider()
  const config = billingConfig(environment)
  const billing = { db: context.db, config, provider }
  const { startCheckout } = await mod('billing/service')
  const { findOrder } = await mod('billing/store')
  const res = await startCheckout(billing, user, {
    packId: pack.id,
    requestId: crypto.randomUUID(),
    returnTo: '/account',
  })
  const o = await findOrder(context.db, res.order.id)
  const payment = {
    business_id: 'biz_test',
    payment_id: `pay_${o.id}`,
    checkout_session_id: o.checkout_session_id,
    status: 'succeeded',
    currency: 'USD',
    total_amount: 549,
    tax: 50,
    product_cart: [{ product_id: pack.productId, quantity: 1 }],
    refunds: [],
    disputes: [],
    metadata: {
      app: 'tuneclue',
      order_id: o.id,
      user_id: o.user_id,
      pack_id: o.pack_id,
      environment,
    },
  }
  provider.payments.set(payment.payment_id, payment)
  provider.sessions.set(o.checkout_session_id, {
    id: o.checkout_session_id,
    payment_id: payment.payment_id,
  })
  return { billing, order: o, payment, provider }
}
