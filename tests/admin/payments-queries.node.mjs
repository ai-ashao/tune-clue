import assert from 'node:assert/strict'
import test from 'node:test'
import { action, attempt, balance, credit, mod, order, other, setup, user } from './helpers.mjs'

const { adminReconcile } = await mod('admin/actions')
const { receiveWebhook, reconcileOrder } = await mod('billing/service')
const {
  listOrders,
  orderDetail,
  listEvents,
  overview,
  searchUsers,
  userDetail,
  userCredits,
  listRecognitions,
  recognitionDetail,
  parseFilter,
  queryObject,
} = await mod('admin/queries')
function reconcile(context, id, billing, input = action('user_reports_missing_credits')) {
  return adminReconcile(context, id, input, async () => billing)
}
function webhook(payment, id = crypto.randomUUID()) {
  return {
    id,
    type: 'payment.succeeded',
    occurredAt: Date.now(),
    data: { payment_id: payment.payment_id },
  }
}
test('administrator reconciliation and webhook concurrency cannot double grant', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await Promise.all([
    reconcile(c, p.order.id, p.billing),
    receiveWebhook(p.billing, webhook(p.payment)),
  ])
  assert.equal(await balance(c.db), 20)
  assert.equal((await orderDetail(c.db, p.order.id)).consistency, 'consistent')
  assert.equal(
    (
      await c.db
        .prepare(
          "SELECT COUNT(*) n FROM admin_audit_logs WHERE event_kind IN ('succeeded','no_change')",
        )
        .first()
    ).n,
    1,
  )
})
for (const [name, mutate] of [
  [
    'amount',
    (p) => {
      p.total_amount = 999
    },
  ],
  [
    'currency',
    (p) => {
      p.currency = 'EUR'
    },
  ],
  [
    'merchant',
    (p) => {
      p.business_id = 'biz_other'
    },
  ],
  [
    'user',
    (p) => {
      p.metadata.user_id = other.id
    },
  ],
  [
    'product',
    (p) => {
      p.product_cart[0].product_id = 'pdt_other'
    },
  ],
  [
    'quantity',
    (p) => {
      p.product_cart[0].quantity = 2
    },
  ],
])
  test(`mismatched ${name} remains review with no forced grant`, async (t) => {
    const c = await setup()
    t.after(() => c.db.close())
    const p = await order(c)
    mutate(p.payment)
    p.provider.payments.set(p.payment.payment_id, p.payment)
    const r = await reconcile(c, p.order.id, p.billing)
    assert.equal(r.outcome, 'review_required')
    assert.equal(r.state, 'review')
    assert.equal(await balance(c.db), 0)
    const audits = await c.db
      .prepare("SELECT event_kind FROM admin_audit_logs WHERE event_kind!='started'")
      .all()
    assert.equal(audits.results[0].event_kind, 'review')
  })
test('reconcile retains exact 15-second throttle and distinguishes no extra query', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await reconcile(c, p.order.id, p.billing)
  const count = p.provider.reads
  const r = await reconcile(c, p.order.id, p.billing)
  assert.equal(r.outcome, 'throttled')
  assert.equal(p.provider.reads, count)
  assert.equal(await balance(c.db), 20)
})
test('same operation repeats its outcome instead of checking provider again', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  const a = action('verification_after_fix')
  const first = await reconcile(c, p.order.id, p.billing, a)
  const count = p.provider.reads
  assert.deepEqual(await reconcile(c, p.order.id, p.billing, a), first)
  assert.equal(p.provider.reads, count)
})
test('paid order with already consistent rights returns unchanged after permitted query', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await reconcile(c, p.order.id, p.billing)
  await c.db
    .prepare('UPDATE billing_orders SET last_reconcile_at=0 WHERE id=?')
    .bind(p.order.id)
    .run()
  const r = await reconcile(c, p.order.id, p.billing)
  assert.equal(r.outcome, 'unchanged')
  assert.equal(await balance(c.db), 20)
})
test('pending checkout reports payment_not_ready and does not pretend to grant', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  p.provider.sessions.set(p.order.checkout_session_id, { id: p.order.checkout_session_id })
  const r = await reconcile(c, p.order.id, p.billing)
  assert.equal(r.outcome, 'payment_not_ready')
  assert.equal(await balance(c.db), 0)
})
test('missing checkout session never creates a new payment or guesses payment ID', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  // Insert a genuinely incomplete separate order (immutable identity forbids clearing an established session).
  const original = {
    ...p.order,
    id: crypto.randomUUID(),
    request_key: crypto.randomUUID(),
    checkout_session_id: null,
    checkout_url: null,
    payment_id: null,
  }
  const fields = Object.keys(original)
  await c.db
    .prepare(
      `INSERT INTO billing_orders (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`,
    )
    .bind(...Object.values(original))
    .run()
  const r = await reconcile(c, original.id, p.billing)
  assert.equal(r.outcome, 'checkout_missing')
  assert.equal(p.provider.creates, 1)
  assert.equal(p.provider.reads, 0)
})
test('test order is read-only under live provider config and cannot fund recognition', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c, 'test_mode')
  p.billing.config.environment = 'live_mode'
  assert.equal((await reconcile(c, p.order.id, p.billing)).outcome, 'environment_unavailable')
  assert.equal(p.provider.reads, 0)
  assert.equal(await balance(c.db), 0)
})
test('test checkout grants only test ledger, independent of recognition environment', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c, 'test_mode')
  await reconcile(c, p.order.id, p.billing)
  const u = await userDetail(c.db, user.id)
  assert.equal(u.balance, 0)
  assert.equal(u.test_balance, 20)
  assert.equal((await orderDetail(c.db, p.order.id)).consistency, 'consistent')
})
test('closing new sales does not disable reconciliation of existing orders', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  p.billing.config.enabled = false
  const r = await reconcile(c, p.order.id, p.billing)
  assert.equal(r.outcome, 'updated')
  assert.equal(await balance(c.db), 20)
})
test('user-side reconcile still refuses another users order', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await assert.rejects(() => reconcileOrder(p.billing, other.id, p.order.id))
  assert.equal(await balance(c.db), 0)
})
test('terminal audit failure rolls back grant and order fact in the same transaction', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  c.db.failSql = 'SELECT ?,o.id,o.admin_user_id,o.state'
  await assert.rejects(() => reconcile(c, p.order.id, p.billing))
  c.db.failSql = null
  assert.equal(await balance(c.db), 0)
  assert.equal((await orderDetail(c.db, p.order.id)).paid_at, null)
  assert.equal(
    (
      await c.db
        .prepare("SELECT COUNT(*) n FROM admin_audit_logs WHERE event_kind!='started'")
        .first()
    ).n,
    0,
  )
})
test('lease lost during external query prevents stale executor grant', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  const old = p.provider.retrievePayment.bind(p.provider)
  p.provider.retrievePayment = async (id) => {
    await c.db
      .prepare(
        "UPDATE admin_operations SET lease_token='successor',lease_until=? WHERE state='running'",
      )
      .bind(Date.now() + 60000)
      .run()
    return old(id)
  }
  const r = await reconcile(c, p.order.id, p.billing)
  assert.equal(r.state, 'running')
  assert.equal(await balance(c.db), 0)
})
test('order net entitlement is not reduced when the user consumes five credits', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await reconcile(c, p.order.id, p.billing)
  await credit(c.db, user.id, -5)
  const o = await orderDetail(c.db, p.order.id)
  assert.equal(o.ledger_net, 20)
  assert.equal(o.user_balance, 15)
  assert.equal(o.consistency, 'consistent')
})
test('fully refunded rights at zero are consistent while confirmed payment history persists', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await reconcile(c, p.order.id, p.billing)
  p.payment.refunds = [
    {
      refund_id: 'ref_full',
      status: 'succeeded',
      amount: 549,
      currency: 'USD',
      payment_id: p.payment.payment_id,
      business_id: 'biz_test',
    },
  ]
  p.provider.payments.set(p.payment.payment_id, p.payment)
  await c.db
    .prepare('UPDATE billing_orders SET last_reconcile_at=0 WHERE id=?')
    .bind(p.order.id)
    .run()
  await reconcile(c, p.order.id, p.billing)
  const o = await orderDetail(c.db, p.order.id)
  assert.equal(o.consistency, 'consistent')
  assert.equal(o.target_credits, 0)
  assert.equal(o.ledger_net, 0)
  assert.equal((await overview(c.db)).confirmedLiveOrders, 1)
})
test('unlinked pending event appears in exceptions and does not vanish through join', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await c.db
    .prepare(
      "INSERT INTO billing_events VALUES ('live_mode','unlinked','payment.succeeded',NULL,'pending',?,NULL,NULL)",
    )
    .bind(Date.now())
    .run()
  const events = await listEvents(c.db, { limit: 30, issue: 'active' })
  assert.equal(events.items[0].order_id, null)
  assert.equal((await overview(c.db)).openIssues, 1)
})
test('historical review is covered by a strictly later valid processed event, not erased', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await reconcile(c, p.order.id, p.billing)
  const now = Date.now() + 1000
  await c.db
    .prepare(
      "INSERT INTO billing_events VALUES ('live_mode','old_review','payment.succeeded',?,'review',?,NULL,'old')",
    )
    .bind(p.order.id, now - 2000)
    .run()
  await c.db
    .prepare(
      "INSERT INTO billing_events VALUES ('live_mode','new_success','server.reconcile',?,'processed',?,?,NULL)",
    )
    .bind(p.order.id, now, now)
    .run()
  const e = (await listEvents(c.db, { limit: 30, orderId: p.order.id })).items.find(
    (x) => x.event_id === 'old_review',
  )
  assert.equal(e.state, 'review')
  assert.equal(e.active, 0)
  assert.equal(e.covering_event_id, 'new_success')
  await c.db
    .prepare(
      "INSERT INTO billing_events VALUES ('live_mode','new_error','payment.succeeded',?,'pending',?,NULL,NULL)",
    )
    .bind(p.order.id, now + 1)
    .run()
  assert.equal(
    (await listEvents(c.db, { limit: 30, orderId: p.order.id })).items.find(
      (x) => x.event_id === 'old_review',
    ).active,
    1,
  )
})
test('same order in two exception categories counts once in global open issues', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await c.db.prepare("UPDATE billing_orders SET status='review' WHERE id=?").bind(p.order.id).run()
  await c.db
    .prepare(
      "INSERT INTO billing_events VALUES ('live_mode','event_review','payment.succeeded',?,'review',?,NULL,'mismatch')",
    )
    .bind(p.order.id, Date.now())
    .run()
  const o = await overview(c.db)
  assert.equal(o.groups.orders, 1)
  assert.equal(o.groups.events, 1)
  assert.equal(o.openIssues, 1)
})
test('case insensitive complete-email search uses bound values', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  assert.equal((await searchUsers(c.db, { q: user.email.toUpperCase() })).items[0].id, user.id)
  assert.equal((await searchUsers(c.db, { q: "a'OR1=1@example.invalid" })).items.length, 0)
  assert.equal(
    c.db.queries.some((q) => q.includes(user.email)),
    false,
  )
})
test('keyset pagination is stable across inserted newer row and identical timestamps', async (t) => {
  const c = await setup(1000)
  t.after(() => c.db.close())
  const first = await searchUsers(c.db, { limit: 1 })
  await c.db
    .prepare(
      "INSERT INTO users(id,google_sub,email,created_at,updated_at) VALUES ('new','new','new@example.invalid',2000,2000)",
    )
    .run()
  const second = await searchUsers(c.db, { limit: 1, cursor: first.nextCursor })
  assert.notEqual(second.items[0].id, first.items[0].id)
  assert.notEqual(second.items[0].id, 'new')
})
test('legacy deductions are labelled incomplete without fabricating recognition success rate', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await c.db
    .prepare(
      "INSERT INTO credit_transactions VALUES ('old',?,-1,'recognition','old','recognition:old',?)",
    )
    .bind(user.id, Date.now())
    .run()
  assert.equal((await userDetail(c.db, user.id)).legacy_attempts, 1)
  assert.equal((await overview(c.db)).quality, null)
  assert.equal((await listRecognitions(c.db, { limit: 30 })).items.length, 0)
})
test('admin order view omits checkout bearer URL and credit result replay data', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  const o = await orderDetail(c.db, p.order.id)
  assert.equal(o.checkout_url, undefined)
  assert.equal(o.request_key, undefined)
  await credit(c.db)
  const a = await attempt(c.db)
  await c.db
    .prepare('UPDATE recognition_attempts SET result_json=?,payload_fingerprint=? WHERE id=?')
    .bind('{"title":"private_cache"}', 'raw_fingerprint', a.id)
    .run()
  const r = await recognitionDetail(c.db, a.id)
  assert.equal(r.result_json, undefined)
  assert.equal(r.payload_fingerprint, undefined)
})
test('overview UTC day boundaries and paid_at filter do not use order-created time', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  await reconcile(c, p.order.id, p.billing)
  await c.db.prepare('UPDATE billing_orders SET created_at=1 WHERE id=?').bind(p.order.id).run()
  const now = Date.now()
  assert.equal(
    (await listOrders(c.db, { limit: 30, confirmed: 'yes', from: now - 10000, to: now + 10000 }))
      .items.length,
    1,
  )
  const o = await overview(c.db, 'today', Date.UTC(2026, 8, 11, 23, 59))
  assert.equal(o.from, Date.UTC(2026, 8, 11))
  assert.equal(o.to, Date.UTC(2026, 8, 12))
})
test('invalid filters never select arbitrary table, sort, or SQL', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  for (const f of [
    { limit: 101 },
    { environment: 'other' },
    { cursor: 'bad+' },
    { from: 8, to: 7 },
    { sort: 'email' },
  ])
    assert.throws(() => parseFilter(f))
  await assert.rejects(
    () => userCredits(c.db, user.id, 'credit_transactions;DELETE', { limit: 30 }),
    /invalid_ledger/,
  )
  assert.throws(() => queryObject(new URLSearchParams('q=a&q=b')), /duplicate_parameter/)
})

test('lease deadline is evaluated after slow provider query instead of captured before it', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const p = await order(c)
  const realNow = Date.now
  const original = p.provider.retrievePayment.bind(p.provider)
  p.provider.retrievePayment = async (id) => {
    const value = await original(id)
    const future = realNow() + 61000
    Date.now = () => future
    return value
  }
  try {
    const result = await reconcile(c, p.order.id, p.billing)
    assert.equal(result.state, 'running')
    assert.equal(await balance(c.db), 0)
  } finally {
    Date.now = realNow
  }
})
