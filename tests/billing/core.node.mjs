import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  balance,
  config,
  dispute,
  event,
  module,
  pack,
  refund,
  secondUser,
  setup,
  user,
} from './helpers.mjs'

const { startCheckout, receiveWebhook, reconcileOrder } = await module('service')
const { findOrder, ownOrder, orderHistory } = await module('store')
const {
  parseBillingConfig,
  checkoutAvailable,
  catalog: publicCatalog,
  safeReturnTo,
} = await module('config')
const { DodoProvider, validCheckoutUrl } = await module('dodo')
const { verifyWebhook } = await module('signature')
const { requireSameOrigin, readBody } = await module('http')
const { fulfillPayment } = await module('fulfillment')
const { validatePayment } = await module('payment')

function put(context, payment) {
  context.provider.payments.set(payment.payment_id, structuredClone(payment))
}
const rejection = (code) => (error) => error.code === code

for (const [name, mutate] of [
  [
    'missing keys',
    (c) => {
      c.apiKey = ''
    },
  ],
  [
    'disabled feature',
    (c) => {
      c.enabled = false
    },
  ],
  [
    'unapproved live mode',
    (c) => {
      c.liveApproved = false
    },
  ],
  [
    'no packs',
    (c) => {
      c.packs = []
    },
  ],
])
  test(`catalog fails closed: ${name}`, () => {
    const c = config()
    mutate(c)
    assert.equal(checkoutAvailable(c), false)
    assert.deepEqual(publicCatalog(c).packs, [])
  })

test('configuration starts disabled with test mode and empty catalog', () => {
  const c = parseBillingConfig({})
  assert.equal(c.enabled, false)
  assert.equal(c.environment, 'test_mode')
  assert.equal(c.packs.length, 0)
})

test('no secrets or provider product IDs leak in public catalog', () => {
  const c = publicCatalog(config())
  assert.equal(c.available, true)
  const json = JSON.stringify(c)
  assert.ok(
    !json.includes('productId') && !json.includes('fixture-not') && !json.includes('biz_test'),
  )
})

for (const bad of ['not-json', '{}', '[{"id":"bad"}]'])
  test(`malformed pack config rejected: ${bad}`, () => {
    assert.throws(() => parseBillingConfig({ DODO_CREDIT_PACKS_JSON: bad }))
  })

test('redirect policy allows only exact local product destinations', () => {
  for (const bad of [
    'https://evil.invalid',
    '//evil.invalid',
    '/\\evil.invalid',
    '/api/billing/webhook',
    '/account?email=x',
  ]) {
    assert.equal(safeReturnTo(bad), '/account')
  }
  assert.equal(safeReturnTo('/identify?purchase_resume=1'), '/identify?purchase_resume=1')
})

for (const origin of [null, 'https://evil.invalid'])
  test(`cross-origin checkout request blocked: ${origin}`, () => {
    const headers = { 'content-type': 'application/json', ...(origin ? { origin } : {}) }
    assert.throws(() =>
      requireSameOrigin(
        new Request('https://tuneclue.com/api/billing/checkout', { method: 'POST', headers }),
        config().siteUrl,
      ),
    )
  })

test('same-origin JSON request passes; streamed body limits are enforced', async () => {
  const request = new Request('https://tuneclue.com/api/billing/checkout', {
    method: 'POST',
    headers: { origin: 'https://tuneclue.com', 'content-type': 'application/json' },
    body: '{}',
  })
  requireSameOrigin(request, config().siteUrl)
  assert.equal((await readBody(request)).length, 2)
  await assert.rejects(
    readBody(new Request('https://tuneclue.com', { method: 'POST', body: 'x'.repeat(4097) })),
    rejection('body-too-large'),
  )
})

for (const field of ['amount', 'credits', 'user_id', 'product_id', 'currency'])
  test(`client cannot choose ${field}`, async () => {
    const { context, input } = await setup()
    await assert.rejects(
      startCheckout(context, user, { ...input, [field]: 1 }),
      rejection('invalid-request'),
    )
  })

test('same request is reused rather than creating a second remote checkout', async () => {
  const { context, order, input } = await setup()
  const results = await Promise.all([
    startCheckout(context, user, input),
    startCheckout(context, user, input),
  ])
  assert.ok(results.every((result) => result.order.id === order.id))
  assert.equal(context.provider.creates, 1)
})

test('concurrent fresh same-key requests create exactly one order and one checkout', async () => {
  const { context } = await setup()
  const input = { packId: pack.id, requestId: crypto.randomUUID(), returnTo: '/account' }
  const [a, b] = await Promise.all([
    startCheckout(context, user, input),
    startCheckout(context, user, input),
  ])
  assert.equal(a.order.id, b.order.id)
  assert.equal(context.provider.creates, 2) // one fixture, one new
})

test('same checkout request cannot be rebound to another return flow', async () => {
  const { context, input } = await setup()
  await assert.rejects(
    startCheckout(context, user, { ...input, returnTo: '/' }),
    rejection('checkout-conflict'),
  )
})

test('durable account checkout limit prevents unlimited provider calls', async () => {
  const { context } = await setup()
  for (let i = 1; i < 10; i++)
    await startCheckout(context, user, { packId: pack.id, requestId: crypto.randomUUID() })
  await assert.rejects(
    startCheckout(context, user, { packId: pack.id, requestId: crypto.randomUUID() }),
    rejection('rate-limited'),
  )
  assert.equal(context.provider.creates, 10)
})

test('provider outage leaves recoverable order and no credits', async () => {
  const { context } = await setup()
  context.provider.validateProduct = async () => {
    throw new Error('Provider offline')
  }
  const requestId = crypto.randomUUID()
  await assert.rejects(startCheckout(context, user, { packId: pack.id, requestId }))
  const row = await context.db
    .prepare('SELECT * FROM billing_orders WHERE request_key = ?')
    .bind(requestId)
    .first()
  assert.equal(row.status, 'checkout_failed')
  assert.equal(await balance(context), 1)
})

test('orders and reconciliation enforce account ownership', async () => {
  const { context, order } = await setup()
  await assert.rejects(ownOrder(context.db, order.id, secondUser.id), rejection('order-not-found'))
  await assert.rejects(
    reconcileOrder(context, secondUser.id, order.id),
    rejection('order-not-found'),
  )
  assert.equal((await orderHistory(context.db, secondUser.id)).orders.length, 0)
})

test('paid webhook grants only once across duplicate and distinct event IDs', async () => {
  const { context, payment } = await setup()
  const e = event(payment)
  await receiveWebhook(context, e)
  await receiveWebhook(context, e)
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), 21)
  const count = await context.db
    .prepare("SELECT COUNT(*) n FROM credit_transactions WHERE type = 'purchase'")
    .first()
  assert.equal(count.n, 1)
})

test('concurrent paid webhooks cannot duplicate credits', async () => {
  const { context, payment } = await setup()
  const e = event(payment)
  await Promise.all([
    receiveWebhook(context, e),
    receiveWebhook(context, e),
    receiveWebhook(context, event(payment)),
  ])
  assert.equal(await balance(context), 21)
})

test('test payment balance is isolated from live recognition credits', async () => {
  const { context, payment } = await setup('test_mode')
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), 20)
  assert.equal(await balance(context, 'live_mode'), 1)
})

test('disabling new sales does not disable fulfillment or late refund handling', async () => {
  const { context, payment } = await setup()
  context.config.enabled = false
  await receiveWebhook(context, event(payment))
  payment.refunds.push(refund(payment, 549))
  put(context, payment)
  await receiveWebhook(
    context,
    event(payment, 'refund.succeeded', { refund_id: payment.refunds[0].refund_id }),
  )
  assert.equal(await balance(context), 1)
})

for (const [name, mutate] of [
  [
    'wrong merchant',
    (p) => {
      p.business_id = 'biz_wrong'
    },
  ],
  [
    'wrong user',
    (p) => {
      p.metadata.user_id = secondUser.id
    },
  ],
  [
    'wrong pack',
    (p) => {
      p.metadata.pack_id = 'wrong'
    },
  ],
  [
    'wrong environment',
    (p) => {
      p.metadata.environment = 'test_mode'
    },
  ],
  [
    'wrong product',
    (p) => {
      p.product_cart[0].product_id = 'pdt_wrong'
    },
  ],
  [
    'wrong quantity',
    (p) => {
      p.product_cart[0].quantity = 2
    },
  ],
  [
    'underpayment',
    (p) => {
      p.total_amount = 500
    },
  ],
  [
    'wrong currency',
    (p) => {
      p.currency = 'EUR'
    },
  ],
  [
    'subscription',
    (p) => {
      p.subscription_id = 'sub_wrong'
    },
  ],
  [
    'wrong checkout',
    (p) => {
      p.checkout_session_id = 'cks_other'
    },
  ],
])
  test(`mismatch goes to review without credit delivery: ${name}`, async () => {
    const { context, payment, order } = await setup()
    mutate(payment)
    put(context, payment)
    await receiveWebhook(context, event(payment))
    assert.equal(await balance(context), 1)
    assert.equal((await findOrder(context.db, order.id)).status, 'review')
  })

test('unrelated merchant app events are ignored without touching TuneClue balance', async () => {
  const { context, payment } = await setup()
  payment.metadata = { app: 'some-other-product' }
  put(context, payment)
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), 1)
})

test('temporary provider inconsistency is retried rather than acknowledged', async () => {
  const { context, payment } = await setup()
  const e = event(payment, 'refund.succeeded', { refund_id: 'ref_not_visible_yet' })
  await assert.rejects(receiveWebhook(context, e), rejection('provider-not-ready'))
  const receipt = await context.db
    .prepare('SELECT state FROM billing_events WHERE event_id = ?')
    .bind(e.id)
    .first()
  assert.equal(receipt.state, 'pending')
  assert.equal(await balance(context), 1)
})

test('batch failure rolls back purchase and event fulfillment, then retry succeeds', async () => {
  const { context, payment } = await setup()
  const e = event(payment)
  context.db.failBatchAt = 3
  await assert.rejects(receiveWebhook(context, e), /Injected/)
  assert.equal(await balance(context), 1)
  const receipt = await context.db
    .prepare('SELECT state FROM billing_events WHERE event_id = ?')
    .bind(e.id)
    .first()
  assert.equal(receipt.state, 'pending')
  context.db.failBatchAt = -1
  await receiveWebhook(context, e)
  assert.equal(await balance(context), 21)
})

test('full refund delivered before payment event leaves no purchased credits', async () => {
  const { context, payment } = await setup()
  payment.refunds = [refund(payment, 549)]
  put(context, payment)
  await receiveWebhook(
    context,
    event(payment, 'refund.succeeded', { refund_id: payment.refunds[0].refund_id }),
  )
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), 1)
})

test('partial refunds use cumulative rounding and repeated refunds do not remove twice', async () => {
  const { context, payment, order } = await setup()
  await receiveWebhook(context, event(payment))
  payment.refunds.push(refund(payment, 1))
  put(context, payment)
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), 20)
  payment.refunds.push(refund(payment, 1))
  put(context, payment)
  await receiveWebhook(context, event(payment))
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), 20) // ceil(20 * 2 / 549) = 1, not 2
  assert.equal((await findOrder(context.db, order.id)).refunded_amount, 2)
})

test('stale provider snapshot cannot resurrect completed refunds', async () => {
  const { context, payment } = await setup()
  const stale = structuredClone(payment)
  payment.refunds = [refund(payment, 549)]
  put(context, payment)
  await receiveWebhook(context, event(payment))
  put(context, stale)
  await receiveWebhook(context, event(stale))
  assert.equal(await balance(context), 1)
})

test('concurrent same event with newer refund snapshot remains balance-idempotent', async () => {
  const { context, payment, order } = await setup()
  const e = event(payment)
  const original = validatePayment(payment, order, context.config)
  payment.refunds = [refund(payment, 549)]
  const refunded = validatePayment(payment, order, context.config)
  await fulfillPayment(context.db, order, original, e)
  await fulfillPayment(context.db, order, refunded, e)
  assert.equal(await balance(context), 1)
})

test('refund of already spent credits produces a negative balance, not a free refill', async () => {
  const { context, payment } = await setup()
  await receiveWebhook(context, event(payment))
  await context.db
    .prepare(
      "INSERT INTO credit_transactions (id,user_id,delta,type,idempotency_key,created_at) VALUES ('usage',?,-15,'recognition','usage',2)",
    )
    .bind(user.id)
    .run()
  payment.refunds = [refund(payment, 549)]
  put(context, payment)
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), -14)
  const result = await context.db
    .prepare(`INSERT INTO credit_transactions (id,user_id,delta,type,idempotency_key,created_at)
    SELECT 'another',?,-1,'recognition','another',3 WHERE (SELECT COALESCE(SUM(delta),0) FROM credit_transactions WHERE user_id = ?) >= 1`)
    .bind(user.id, user.id)
    .run()
  assert.equal(result.meta.changes, 0)
})

test('pending or failed refunds do not remove credits', async () => {
  const { context, payment } = await setup()
  payment.refunds = [{ ...refund(payment, 549), status: 'pending' }]
  put(context, payment)
  await receiveWebhook(context, event(payment))
  assert.equal(await balance(context), 21)
})

test('dispute holds credits; win restores only unrefunded entitlement', async () => {
  const { context, payment } = await setup()
  payment.refunds = [refund(payment, 100)]
  payment.disputes = [dispute(payment, 'dispute_opened')]
  put(context, payment)
  await receiveWebhook(context, event(payment, 'dispute.opened', { dispute_id: 'disp_one' }))
  assert.equal(await balance(context), 1)
  payment.disputes[0].dispute_status = 'dispute_won'
  put(context, payment)
  await receiveWebhook(context, {
    ...event(payment, 'dispute.won', { dispute_id: 'disp_one' }),
    occurredAt: Date.now() + 1,
  })
  assert.equal(await balance(context), 17) // 20 - ceil(2000 / 549) + welcome
  payment.disputes[0].dispute_status = 'dispute_opened'
  put(context, payment)
  await receiveWebhook(context, { ...event(payment), occurredAt: Date.now() + 2 })
  assert.equal(await balance(context), 17)
})

test('lost dispute does not restore purchased credits', async () => {
  const { context, payment } = await setup()
  await receiveWebhook(context, event(payment))
  payment.disputes = [dispute(payment, 'dispute_lost')]
  put(context, payment)
  await receiveWebhook(context, event(payment, 'dispute.lost', { dispute_id: 'disp_one' }))
  assert.equal(await balance(context), 1)
})

test('failed payment cannot downgrade a paid order', async () => {
  const { context, payment, order } = await setup()
  await receiveWebhook(context, event(payment))
  payment.status = 'failed'
  put(context, payment)
  await receiveWebhook(context, event(payment, 'payment.failed'))
  assert.equal((await findOrder(context.db, order.id)).status, 'paid')
  assert.equal(await balance(context), 21)
})

test('server reconciliation uses stored checkout session and grants once', async () => {
  const { context, order } = await setup()
  const result = await reconcileOrder(context, user.id, order.id)
  assert.equal(result.status, 'paid')
  assert.equal(await balance(context), 21)
  await reconcileOrder(context, user.id, order.id)
  assert.equal(context.provider.retrieves, 1)
})

test('live context refuses reconciliation of a test order', async () => {
  const { context, order } = await setup('test_mode')
  context.config = config('live_mode')
  await assert.rejects(
    reconcileOrder(context, user.id, order.id),
    rejection('environment-unavailable'),
  )
})

const signingKey = Buffer.from('local-fixture-signature-secret-not-production')
function signed(body, options = {}) {
  const id = 'msg_test'
  const now = Date.now()
  const timestamp = String(Math.floor(now / 1000) + (options.offset || 0))
  const raw = Buffer.from(JSON.stringify(body))
  const mac = createHmac('sha256', signingKey)
    .update(`${id}.${timestamp}.`)
    .update(raw)
    .digest('base64')
  const headers = new Headers({
    'webhook-id': id,
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${mac}`,
  })
  return { raw, headers, secret: `whsec_${signingKey.toString('base64')}`, now }
}
const envelope = () => ({
  business_id: 'biz_test',
  type: 'payment.succeeded',
  timestamp: new Date().toISOString(),
  data: { payment_id: 'pay_test' },
})
test('Standard Webhooks HMAC fixture verifies exact raw body', async () => {
  const { raw, headers, secret, now } = signed(envelope())
  assert.equal(
    (await verifyWebhook(raw, headers, secret, 'biz_test', now)).type,
    'payment.succeeded',
  )
})
for (const [name, change] of [
  [
    'tampered body',
    (x) => {
      x.raw = Buffer.from(` ${x.raw.toString()}`)
    },
  ],
  [
    'missing id',
    (x) => {
      x.headers.delete('webhook-id')
    },
  ],
  [
    'invalid signature',
    (x) => {
      x.headers.set('webhook-signature', 'v1,ZmFrZQ==')
    },
  ],
])
  test(`webhook rejects ${name}`, async () => {
    const x = signed(envelope())
    change(x)
    await assert.rejects(verifyWebhook(x.raw, x.headers, x.secret, 'biz_test', x.now))
  })
for (const offset of [-301, 301])
  test(`webhook rejects timestamp offset ${offset}s`, async () => {
    const x = signed(envelope(), { offset })
    await assert.rejects(verifyWebhook(x.raw, x.headers, x.secret, 'biz_test', x.now))
  })
test('webhook rejects another business even with a valid signature', async () => {
  const x = signed(envelope())
  await assert.rejects(
    verifyWebhook(x.raw, x.headers, x.secret, 'wrong_business', x.now),
    rejection('wrong-business'),
  )
})
test('multiple signatures tolerate a bad old signature while verifying a valid one', async () => {
  const x = signed(envelope())
  x.headers.set('webhook-signature', `v1,invalid! ${x.headers.get('webhook-signature')}`)
  assert.equal((await verifyWebhook(x.raw, x.headers, x.secret, 'biz_test', x.now)).id, 'msg_test')
})

test('Dodo checkout adapter uses official endpoints and immutable order snapshot', async () => {
  const { order } = await setup()
  const calls = []
  const provider = new DodoProvider(config(), async (url, init) => {
    calls.push({ url, init })
    return Response.json({
      session_id: 'cks_fixture',
      checkout_url: 'https://checkout.dodopayments.com/cks_fixture',
    })
  })
  await provider.createCheckout(order, user)
  assert.equal(calls[0].url, 'https://live.dodopayments.com/checkouts')
  const payload = JSON.parse(calls[0].init.body)
  assert.deepEqual(payload.product_cart, [{ product_id: pack.productId, quantity: 1 }])
  assert.equal(payload.metadata.user_id, user.id)
  assert.equal(payload.metadata.order_id, order.id)
  assert.equal(payload.feature_flags.allow_discount_code, false)
  assert.equal(payload.feature_flags.allow_currency_selection, false)
  assert.equal(payload.feature_flags.allow_editing_addons, false)
  assert.ok(payload.return_url.startsWith('https://tuneclue.com/billing/return?order='))
  assert.equal(calls[0].init.redirect, 'error')
})

test('checkout URLs reject hostile hosts, credentials and wrong environment', () => {
  for (const bad of [
    'https://evil.invalid',
    'https://checkout.dodopayments.com.evil.invalid',
    'https://user@checkout.dodopayments.com',
    'http://checkout.dodopayments.com',
    'https://test.checkout.dodopayments.com/',
  ]) {
    assert.throws(() => validCheckoutUrl(bad, config()))
  }
})

for (const [name, change] of [
  [
    'recurring',
    (p) => {
      p.is_recurring = true
    },
  ],
  [
    'different amount',
    (p) => {
      p.price.price = 500
    },
  ],
  [
    'tax inclusive',
    (p) => {
      p.price.tax_inclusive = true
    },
  ],
  [
    'pay what you want',
    (p) => {
      p.price.pay_what_you_want = true
    },
  ],
  [
    'discount',
    (p) => {
      p.price.discount = 10
    },
  ],
  [
    'country-specific prices',
    (p) => {
      p.pricing_mode = 'by_country'
    },
  ],
])
  test(`product preflight rejects ${name}`, async () => {
    const value = {
      product_id: pack.productId,
      business_id: 'biz_test',
      is_recurring: false,
      price: { type: 'one_time_price', price: pack.amount, currency: 'USD' },
    }
    change(value)
    const provider = new DodoProvider(config(), async () => Response.json(value))
    await assert.rejects(provider.validateProduct(pack), rejection('product-mismatch'))
  })

test('provider POST timeout is not automatically retried', async () => {
  let count = 0
  const { order } = await setup()
  const provider = new DodoProvider(config(), async () => {
    count++
    throw new Error('timeout')
  })
  await assert.rejects(provider.createCheckout(order, user), rejection('provider-unavailable'))
  assert.equal(count, 1)
})

test('return page never grants credits from URL status and polling does not reset on each order object', () => {
  const text = readFileSync('src/components/tuneclue/billing-return-page.tsx', 'utf8')
  assert.ok(!text.includes("searchParams.get('status')"))
  assert.ok(text.includes('window.history.replaceState'))
  assert.match(text, /\[\s*orderId,\s*orderStatus,\s*authRequired,\s*refresh,?\s*\]/)
})

test('test environment accepts provider checkout URLs on dedicated or shared official hosts', () => {
  const testConfig = config('test_mode')
  for (const host of ['checkout.dodopayments.com', 'test.checkout.dodopayments.com']) {
    assert.equal(
      new URL(validCheckoutUrl(`https://${host}/session/cks_fixture`, testConfig)).hostname,
      host,
    )
  }
})
