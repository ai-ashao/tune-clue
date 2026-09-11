import { checkoutAvailable, providerReady, safeReturnTo } from './config'
import type { BillingProvider } from './dodo'
import type { EventReference } from './fulfillment'
import { eventState, fulfillPayment, recordEvent, recordReview } from './fulfillment'
import { PaymentReviewError, validatePayment } from './payment'
import type { VerifiedWebhook } from './signature'
import {
  createOrder,
  findOrder,
  markCheckoutFailed,
  ownOrder,
  reserveReconciliation,
  saveCheckout,
} from './store'
import type { BillingConfig, BillingDb, BillingOrder, BillingUser } from './types'
import { BillingError, identifier, object, publicOrder } from './types'

export type BillingContext = { db: BillingDb; config: BillingConfig; provider: BillingProvider }

export async function startCheckout(context: BillingContext, user: BillingUser, body: unknown) {
  const { db, config, provider } = context
  if (!checkoutAvailable(config))
    throw new BillingError('billing-disabled', 'Credit purchases are not available yet.', 503)
  const input = object(body)
  if (Object.keys(input).some((key) => !['packId', 'requestId', 'returnTo'].includes(key))) {
    throw new BillingError('invalid-request', 'Only a configured pack can be purchased.', 400)
  }
  const packId = identifier(input.packId)
  const requestId = identifier(input.requestId)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))
    throw new BillingError('invalid-request', 'Invalid checkout request.', 400)
  const pack = config.packs.find((candidate) => candidate.id === packId)
  if (!pack) throw new BillingError('unknown-pack', 'This credit pack is not available.', 400)
  const result = await createOrder(db, {
    user,
    environment: config.environment,
    requestId,
    pack,
    returnTo: safeReturnTo(input.returnTo),
  })
  if (!result.created) {
    const order = result.order
    if (
      order.status === 'pending' &&
      order.checkout_url &&
      Date.now() - order.created_at < 23 * 60 * 60_000
    ) {
      // Same user, same unfinished local request only. Never share across users or new attempts.
      return { order: publicOrder(order), checkoutUrl: order.checkout_url }
    }
    return { order: publicOrder(order), checkoutUrl: null }
  }
  try {
    await provider.validateProduct(pack)
    const checkout = await provider.createCheckout(result.order, user)
    await saveCheckout(db, result.order.id, checkout.sessionId, checkout.checkoutUrl)
    return {
      order: publicOrder(await ownOrder(db, result.order.id, user.id)),
      checkoutUrl: checkout.checkoutUrl,
    }
  } catch (error) {
    await markCheckoutFailed(db, result.order.id).catch(() => undefined)
    throw error
  }
}

async function applyCurrentPayment(
  context: BillingContext,
  paymentId: string,
  event: EventReference,
  expectedOrder?: BillingOrder,
  requiredResource?: { kind: 'refund' | 'dispute'; id: string },
) {
  const { db, config, provider } = context
  const data = await provider.retrievePayment(paymentId)
  const metadata = object(data.metadata)
  if (metadata.app !== 'tuneclue') {
    if (expectedOrder) throw new PaymentReviewError('payment-identity-mismatch')
    await recordEvent(db, config.environment, event, 'ignored', null, 'different-product')
    return
  }
  const orderId = identifier(metadata.order_id)
  const order = expectedOrder || (await findOrder(db, orderId))
  if (!order) throw new BillingError('order-not-ready', 'Order is not available yet.', 503)
  try {
    if (order.id !== orderId || data.payment_id !== paymentId)
      throw new PaymentReviewError('payment-identity-mismatch')
    const snapshot = validatePayment(data, order, config)
    if (event.type === 'payment.succeeded' && snapshot.status !== 'succeeded') {
      throw new BillingError(
        'provider-not-ready',
        'Payment confirmation is not available yet.',
        503,
      )
    }
    if (requiredResource) {
      const resources = requiredResource.kind === 'refund' ? snapshot.refunds : snapshot.disputes
      if (!resources.some((entry) => entry.id === requiredResource.id)) {
        throw new BillingError(
          'provider-not-ready',
          'The latest payment adjustment is not available yet.',
          503,
        )
      }
    }
    await fulfillPayment(db, order, snapshot, event)
  } catch (error) {
    if (error instanceof PaymentReviewError) {
      await recordReview(db, order, event, error.code)
      console.error('TuneClue payment needs review', { orderId: order.id, code: error.code })
      return
    }
    throw error
  }
}

export async function receiveWebhook(context: BillingContext, event: VerifiedWebhook) {
  const { db, config } = context
  if (!providerReady(config))
    throw new BillingError('billing-config', 'Webhook processing is not configured.', 503)
  const existing = await eventState(db, config.environment, event.id)
  if (existing?.state === 'processed' || existing?.state === 'ignored')
    return { received: true, duplicate: true }
  await recordEvent(db, config.environment, event, 'pending')
  const handled = [
    'payment.succeeded',
    'payment.failed',
    'payment.cancelled',
    'payment.processing',
    'refund.succeeded',
  ]
  if (!handled.includes(event.type) && !event.type.startsWith('dispute.')) {
    await recordEvent(db, config.environment, event, 'ignored', null, 'event-not-used')
    return { received: true }
  }
  const paymentId = identifier(event.data.payment_id)
  const requiredResource =
    event.type === 'refund.succeeded'
      ? { kind: 'refund' as const, id: identifier(event.data.refund_id) }
      : event.type.startsWith('dispute.')
        ? { kind: 'dispute' as const, id: identifier(event.data.dispute_id) }
        : undefined
  await applyCurrentPayment(context, paymentId, event, undefined, requiredResource)
  return { received: true }
}

export async function reconcileOrder(context: BillingContext, userId: string, orderId: string) {
  const { db, config, provider } = context
  const order = await ownOrder(db, orderId, userId)
  if (!providerReady(config) || order.environment !== config.environment) {
    throw new BillingError(
      'environment-unavailable',
      'This order belongs to a different billing environment. Contact support if it needs attention.',
      409,
    )
  }
  if (!order.checkout_session_id || !(await reserveReconciliation(db, order)))
    return publicOrder(order)
  // Never accept a payment_id, amount, status or user identity from the return URL.
  const session = await provider.retrieveCheckout(order.checkout_session_id)
  if (session.id !== order.checkout_session_id)
    throw new PaymentReviewError('payment-session-mismatch')
  if (!session.payment_id) return publicOrder(await ownOrder(db, orderId, userId))
  await applyCurrentPayment(
    context,
    identifier(session.payment_id),
    {
      id: `sync_${crypto.randomUUID()}`,
      type: 'server.reconcile',
      occurredAt: Date.now(),
    },
    order,
  )
  return publicOrder(await ownOrder(db, orderId, userId))
}
