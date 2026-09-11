import type { BillingConfig, BillingOrder } from './types'
import { BillingError, identifier, integer, object } from './types'

export class PaymentReviewError extends BillingError {
  constructor(code: string) {
    super(code, 'This payment needs review. Contact support with your TuneClue order number.', 409)
    this.name = 'PaymentReviewError'
  }
}

export type PaymentSnapshot = {
  id: string
  sessionId: string
  status: string
  amount: number
  refunds: { id: string; amount: number; currency: string }[]
  disputes: { id: string; status: string }[]
}

const disputeStates = new Set([
  'dispute_opened',
  'dispute_expired',
  'dispute_accepted',
  'dispute_cancelled',
  'dispute_challenged',
  'dispute_won',
  'dispute_lost',
])

export function validatePayment(
  payment: Record<string, unknown>,
  order: BillingOrder,
  config: BillingConfig,
): PaymentSnapshot {
  const metadata = object(payment.metadata)
  if (
    payment.business_id !== config.businessId ||
    metadata.app !== 'tuneclue' ||
    metadata.order_id !== order.id ||
    metadata.user_id !== order.user_id ||
    metadata.environment !== order.environment ||
    metadata.pack_id !== order.pack_id ||
    order.environment !== config.environment
  )
    throw new PaymentReviewError('payment-identity-mismatch')
  const id = identifier(payment.payment_id)
  const sessionId = identifier(payment.checkout_session_id)
  if (
    (order.payment_id && order.payment_id !== id) ||
    (order.checkout_session_id && order.checkout_session_id !== sessionId)
  ) {
    throw new PaymentReviewError('payment-session-mismatch')
  }
  if (payment.subscription_id) throw new PaymentReviewError('unexpected-subscription')
  const status = typeof payment.status === 'string' ? payment.status : 'processing'
  if (status !== 'succeeded') {
    return { id, sessionId, status, amount: 0, refunds: [], disputes: [] }
  }
  const cart = payment.product_cart
  if (!Array.isArray(cart) || cart.length !== 1)
    throw new PaymentReviewError('payment-cart-mismatch')
  const item = object(cart[0])
  if (item.product_id !== order.product_id || item.quantity !== 1)
    throw new PaymentReviewError('payment-cart-mismatch')
  const amount = integer(payment.total_amount, 1)
  const tax = payment.tax == null ? 0 : integer(payment.tax)
  // V1 intentionally sells fixed, tax-exclusive USD packs. Localized/discounted pricing is not silently accepted.
  if (
    payment.currency !== order.currency ||
    amount - tax !== order.amount ||
    (order.paid_amount !== null && order.paid_amount !== amount)
  )
    throw new PaymentReviewError('payment-amount-mismatch')
  if (!Array.isArray(payment.refunds) || !Array.isArray(payment.disputes)) {
    throw new BillingError(
      'provider-response',
      'Payment details are not complete yet. Try again shortly.',
      503,
    )
  }
  const refunds: PaymentSnapshot['refunds'] = []
  const seenRefunds = new Map<string, number>()
  for (const entry of payment.refunds) {
    const refund = object(entry)
    if (refund.status !== 'succeeded') continue
    const refundId = identifier(refund.refund_id)
    const refundAmount = integer(refund.amount, 1)
    if (
      refund.payment_id !== id ||
      refund.business_id !== config.businessId ||
      refund.currency !== order.currency
    ) {
      throw new PaymentReviewError('refund-identity-mismatch')
    }
    if (seenRefunds.has(refundId)) {
      if (seenRefunds.get(refundId) !== refundAmount)
        throw new PaymentReviewError('refund-amount-mismatch')
      continue
    }
    seenRefunds.set(refundId, refundAmount)
    refunds.push({ id: refundId, amount: refundAmount, currency: order.currency })
  }
  if (refunds.reduce((sum, refund) => sum + refund.amount, 0) > amount) {
    throw new PaymentReviewError('refund-total-mismatch')
  }
  const disputes: PaymentSnapshot['disputes'] = []
  for (const entry of payment.disputes) {
    const dispute = object(entry)
    if (
      dispute.payment_id !== id ||
      dispute.business_id !== config.businessId ||
      typeof dispute.dispute_status !== 'string' ||
      !disputeStates.has(dispute.dispute_status)
    ) {
      throw new PaymentReviewError('dispute-data-mismatch')
    }
    disputes.push({ id: identifier(dispute.dispute_id), status: dispute.dispute_status })
  }
  return { id, sessionId, status, amount, refunds, disputes }
}
