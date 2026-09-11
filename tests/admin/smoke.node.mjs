import assert from 'node:assert/strict'
import test from 'node:test'
import { action, attempt, balance, credit, mod, order, setup, user } from './helpers.mjs'

test('manual return writes one credit and a terminal audit in one transaction', async () => {
  const c = await setup()
  await credit(c.db)
  const a = await attempt(c.db)
  const { adminReturnCredit } = await mod('admin/actions')
  const r = await adminReturnCredit(c, a.id, action())
  assert.equal(r.outcome, 'returned')
  assert.equal(await balance(c.db), 1)
  const audits = await c.db
    .prepare('SELECT event_kind FROM admin_audit_logs WHERE operation_id=? ORDER BY event_kind')
    .bind(r.operationId)
    .all()
  assert.deepEqual(
    audits.results.map((r) => r.event_kind),
    ['started', 'succeeded'],
  )
  c.db.close()
})
test('manual reconciliation grants credits and writes audit', async () => {
  const c = await setup()
  const o = await order(c)
  const { adminReconcile } = await mod('admin/actions')
  const r = await adminReconcile(
    c,
    o.order.id,
    action('user_reports_missing_credits'),
    async () => o.billing,
  )
  assert.equal(r.outcome, 'updated')
  assert.equal(await balance(c.db), 20)
  c.db.close()
})
test('all read queries run against actual migrations', async () => {
  const c = await setup()
  await credit(c.db)
  await attempt(c.db)
  const o = await order(c)
  const q = await mod('admin/queries')
  assert.equal((await q.searchUsers(c.db, { q: user.email })).items.length, 1)
  assert.equal((await q.userDetail(c.db, user.id)).balance, 0)
  assert.equal((await q.listOrders(c.db, { limit: 30 })).items.length, 1)
  assert.equal((await q.orderDetail(c.db, o.order.id)).consistency, 'not_granted')
  assert.equal((await q.listRecognitions(c.db, { limit: 30 })).items.length, 1)
  assert.equal((await q.listEvents(c.db, { limit: 30 })).items.length, 0)
  const overview = await q.overview(c.db)
  assert.equal(overview.openIssues, 1)
  c.db.close()
})
