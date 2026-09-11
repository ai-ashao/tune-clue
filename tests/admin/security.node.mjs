import assert from 'node:assert/strict'
import test from 'node:test'
import { action, admin, env, mod, request, setup, token, user } from './helpers.mjs'

const { handleAdmin } = await mod('admin/router')
const { parseAdminConfig, parseEstimatedCost } = await mod('admin/config')
const { parseAction, beginOperation, findOperation, leaseGuard, finishStatements } =
  await mod('admin/operations')
const { requireAdminOrigin, readAdminJson } = await mod('admin/http')
function services(context, settings = env) {
  return {
    db: context.db,
    env: settings,
    billing: async () => {
      throw Error('not configured')
    },
  }
}
for (const path of [
  'session',
  'overview',
  'users/user_test',
  'orders',
  'payment-events',
  'recognitions',
  'audit?targetType=order&targetId=unknown',
  'operations/unknown',
]) {
  test(`anonymous cannot read ${path}`, async (t) => {
    const c = await setup()
    t.after(() => c.db.close())
    const res = await handleAdmin(request(path), services(c))
    assert.equal(res.status, 401)
    assert.equal((await res.text()).includes(user.email), false)
  })
}
test('ordinary Google user cannot impersonate administrator with client flags', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const cookie = await token(c.db, user)
  const res = await handleAdmin(
    request('users/search', cookie, { q: user.email, isAdmin: true }),
    services(c),
  )
  assert.equal(res.status, 403)
  assert.equal((await res.text()).includes(user.email), false)
})
test('disabled admin fails closed before querying private records', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const res = await handleAdmin(
    request('overview'),
    services(c, { ...env, ADMIN_ENABLED: 'false' }),
  )
  assert.equal(res.status, 404)
  assert.equal(
    c.db.queries.some((q) => q.includes('FROM sessions')),
    false,
  )
})
test('empty allowlist never grants first account admin access', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const cookie = await token(c.db)
  const res = await handleAdmin(
    request('session', cookie),
    services(c, { ...env, ADMIN_USER_IDS: '' }),
  )
  assert.equal(res.status, 403)
})
test('expired and over-age admin sessions cannot access still-valid public session records', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  for (const [created, expires] of [
    [Date.now() - 8 * 3600000 - 1, Date.now() + 86400000],
    [Date.now() - 100, Date.now() - 1],
  ]) {
    const cookie = await token(c.db, admin, created, expires)
    const res = await handleAdmin(request('session', cookie), services(c))
    assert.equal(res.status, 401)
  }
  assert.equal((await c.db.prepare('SELECT COUNT(*) n FROM sessions').first()).n, 2)
})
test('malformed encoded cookie is rejected without disclosing SQL', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const res = await handleAdmin(request('session', 'tuneclue_session=%ZZ'), services(c))
  assert.equal(res.status, 401)
})
test('successful admin responses are private no-store noindex and no-referrer', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const res = await handleAdmin(request('session', await token(c.db)), services(c))
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('cache-control'), 'private, no-store')
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer')
  assert.match(res.headers.get('x-robots-tag'), /noindex/)
  const p = await res.json()
  assert.equal(p.data.admin.id, admin.id)
  assert.equal(p.data.admin.sessionCreatedAt, undefined)
  assert.equal(JSON.stringify(p).includes('fixture'), false)
})
for (const [title, headers, status] of [
  ['cross-origin', { origin: 'https://attacker.example' }, 403],
  ['null origin', { origin: 'null' }, 403],
  ['missing custom header', { 'x-tuneclue-admin-action': '' }, 403],
  ['form content type', { 'content-type': 'application/x-www-form-urlencoded' }, 415],
  ['cross-site metadata', { 'sec-fetch-site': 'cross-site' }, 403],
]) {
  test(`admin POST rejects ${title}`, async (t) => {
    const c = await setup()
    t.after(() => c.db.close())
    const res = await handleAdmin(
      request('users/search', await token(c.db), { q: user.email }, headers),
      services(c),
    )
    assert.equal(res.status, status)
  })
}
test('admin POST rejects missing Origin', () => {
  assert.throws(
    () =>
      requireAdminOrigin(
        new Request('https://tuneclue.com/api/admin/users/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-tuneclue-admin-action': '1' },
          body: '{}',
        }),
        'https://tuneclue.com',
      ),
    /invalid_origin/,
  )
})
test('oversized streamed request is rejected without relying on content-length', async () => {
  const req = new Request('https://tuneclue.com/api/admin/users/search', {
    method: 'POST',
    body: JSON.stringify({ q: 'x'.repeat(8300) }),
  })
  await assert.rejects(() => readAdminJson(req), /body_too_large/)
})
test('read-only allows search but rejects both business mutations', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const cookie = await token(c.db)
  const readonly = { ...env, ADMIN_WRITE_ENABLED: 'false' }
  assert.equal(
    (await handleAdmin(request('users/search', cookie, { q: user.email }), services(c, readonly)))
      .status,
    200,
  )
  for (const path of ['orders/notreal/reconcile', 'recognitions/notreal/return-credit'])
    assert.equal(
      (await handleAdmin(request(path, cookie, action()), services(c, readonly))).status,
      403,
    )
  assert.equal((await c.db.prepare('SELECT COUNT(*) n FROM admin_operations').first()).n, 0)
})
test('missing Dodo keys and broken new-price JSON do not block read-only business data', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const settings = { ...env, DODO_PAYMENTS_API_KEY: '', DODO_CREDIT_PACKS_JSON: '[invalid' }
  const res = await handleAdmin(
    request('users/search', await token(c.db), { q: user.email }),
    services(c, settings),
  )
  assert.equal(res.status, 200)
  assert.equal((await res.json()).data.items[0].email, user.email)
})
test('missing admin migration is a service error, not empty data', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  c.db.sqlite.exec('DROP TABLE recognition_attempts')
  const res = await handleAdmin(request('overview', await token(c.db)), services(c))
  assert.equal(res.status, 503)
  assert.equal((await res.json()).code, 'admin_schema_unavailable')
})
for (const field of ['userId', 'amount', 'delta', 'paymentId', 'status', 'environment']) {
  test(`mutations reject client-controlled ${field}`, () =>
    assert.throws(
      () =>
        parseAction(action('system_failure', { [field]: 'override' }), 'return_recognition_credit'),
      /unexpected_field/,
    ))
}
test('unknown timeout compensation requires explicit evidence confirmation', () => {
  assert.throws(
    () => parseAction(action('unresolved_timeout'), 'return_recognition_credit'),
    /confirmation_required/,
  )
  assert.throws(
    () =>
      parseAction(
        action('unresolved_timeout', { confirmedUnresolved: true, reasonText: 'x' }),
        'return_recognition_credit',
      ),
    /invalid_reason/,
  )
  assert.equal(
    parseAction(
      action('unresolved_timeout', { confirmedUnresolved: true }),
      'return_recognition_credit',
    ).confirmedUnresolved,
    true,
  )
})
test('same administrator operation ID cannot change target or reason', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const a = action()
  await beginOperation(c, a, 'return_recognition_credit', 'recognition', 'r1', 'spendable')
  await assert.rejects(
    () =>
      beginOperation(
        c,
        { ...a, reasonText: 'Changed verified information' },
        'return_recognition_credit',
        'recognition',
        'r1',
        'spendable',
      ),
    /request_conflict/,
  )
  await assert.rejects(
    () => beginOperation(c, a, 'return_recognition_credit', 'recognition', 'r2', 'spendable'),
    /request_conflict/,
  )
})
test('persistent operation quota rejects the eleventh new minute operation', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  for (let i = 0; i < 10; i++)
    await beginOperation(c, action(), 'reconcile_order', 'order', `o${i}`, 'live_mode')
  await assert.rejects(
    () => beginOperation(c, action(), 'reconcile_order', 'order', 'o11', 'live_mode'),
    (e) => e.status === 429,
  )
})
test('expired operation lease is recovered with a new token and stale worker cannot commit', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const input = action()
  const start = await beginOperation(
    c,
    input,
    'return_recognition_credit',
    'recognition',
    'r1',
    'spendable',
    Date.now() - 61000,
  )
  const recovered = await beginOperation(
    c,
    input,
    'return_recognition_credit',
    'recognition',
    'r1',
    'spendable',
  )
  assert.equal(recovered.acquired, true)
  assert.notEqual(start.operation.lease_token, recovered.operation.lease_token)
  await assert.rejects(() =>
    c.db.batch([
      leaseGuard(c.db, start.operation),
      ...finishStatements(c.db, start.operation, c.traceId, 'succeeded', { outcome: 'false' }),
    ]),
  )
  assert.equal((await findOperation(c.db, recovered.operation.id)).state, 'running')
})
test('immutable audit rows reject update and delete SQL', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await beginOperation(c, action(), 'reconcile_order', 'order', 'o1', 'live_mode')
  assert.throws(
    () => c.db.sqlite.exec("UPDATE admin_audit_logs SET reason_text='changed'"),
    /append-only/,
  )
  assert.throws(() => c.db.sqlite.exec('DELETE FROM admin_audit_logs'), /append-only/)
})
test('operator cannot query another administrator operation result', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const a = await beginOperation(c, action(), 'reconcile_order', 'order', 'o', 'live_mode')
  await c.db
    .prepare('UPDATE admin_operations SET admin_user_id=? WHERE id=?')
    .bind(user.id, a.operation.id)
    .run()
  const res = await handleAdmin(
    request(`operations/${a.operation.id}`, await token(c.db)),
    services(c),
  )
  assert.equal(res.status, 404)
})
test('estimated unit cost has strict decimal parsing and is never inferred from trial mode', () => {
  assert.equal(parseEstimatedCost('0.005'), 5000)
  assert.equal(parseEstimatedCost(''), null)
  for (const value of ['-1', 'NaN', 'Infinity', '1e-3', '0.0000001', {}, undefined])
    assert.equal(parseEstimatedCost(value), null)
  assert.equal(parseAdminConfig({}).enabled, false)
})
