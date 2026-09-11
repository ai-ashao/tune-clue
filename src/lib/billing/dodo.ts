import type { BillingConfig, BillingOrder, BillingUser, CreditPack } from './types'
import { BillingError, identifier, object } from './types'

export interface BillingProvider {
  validateProduct(pack: CreditPack): Promise<void>
  createCheckout(
    order: BillingOrder,
    user: BillingUser,
  ): Promise<{ sessionId: string; checkoutUrl: string }>
  retrieveCheckout(sessionId: string): Promise<Record<string, unknown>>
  retrievePayment(paymentId: string): Promise<Record<string, unknown>>
}

export function validCheckoutUrl(value: unknown, config: BillingConfig): string {
  if (typeof value !== 'string')
    throw new BillingError('provider-response', 'Checkout could not be opened.', 502)
  const url = new URL(value)
  // Test responses may use the shared checkout host or the dedicated test host.
  // Environment isolation comes from the authenticated API and separate ledger, not a URL claim.
  const hosts =
    config.environment === 'test_mode'
      ? ['checkout.dodopayments.com', 'test.checkout.dodopayments.com']
      : ['checkout.dodopayments.com']
  if (
    url.protocol !== 'https:' ||
    !hosts.includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new BillingError('provider-response', 'Checkout address could not be verified.', 502)
  }
  return url.toString()
}

export class DodoProvider implements BillingProvider {
  private readonly config: BillingConfig
  private readonly fetcher: typeof fetch

  constructor(config: BillingConfig, fetcher: typeof fetch = fetch) {
    this.config = config
    this.fetcher = fetcher
  }

  private async request(path: string, body?: unknown): Promise<Record<string, unknown>> {
    if (!this.config.apiKey)
      throw new BillingError('billing-config', 'Billing is not configured.', 503)
    const origin =
      this.config.environment === 'test_mode'
        ? 'https://test.dodopayments.com'
        : 'https://live.dodopayments.com'
    let response: Response
    try {
      response = await this.fetcher(`${origin}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
      })
    } catch {
      // Never blindly retry checkout creation: no undocumented upstream idempotency assumptions.
      throw new BillingError(
        'provider-unavailable',
        'The payment service did not respond. Check your orders before starting a new checkout.',
        503,
      )
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      throw new BillingError(
        'provider-unavailable',
        'The payment service could not complete this request. Try again later.',
        503,
      )
    }
    try {
      return object(await response.json())
    } catch {
      throw new BillingError(
        'provider-response',
        'The payment service returned an unexpected response.',
        502,
      )
    }
  }

  async validateProduct(pack: CreditPack): Promise<void> {
    const product = await this.request(`/products/${encodeURIComponent(pack.productId)}`)
    const price = object(product.price)
    if (
      product.product_id !== pack.productId ||
      product.business_id !== this.config.businessId ||
      product.is_recurring !== false ||
      product.is_archived === true ||
      product.pricing_mode === 'by_country' ||
      price.type !== 'one_time_price' ||
      price.currency !== pack.currency ||
      price.price !== pack.amount ||
      price.pay_what_you_want === true ||
      price.tax_inclusive === true ||
      price.purchasing_power_parity === true ||
      Number(price.discount || 0) !== 0 ||
      Number(price.discount_bps || 0) !== 0
    ) {
      throw new BillingError(
        'product-mismatch',
        'This credit pack is temporarily unavailable. Please contact support.',
        503,
      )
    }
  }

  async createCheckout(order: BillingOrder, user: BillingUser) {
    const returnUrl = new URL('/billing/return', this.config.siteUrl)
    returnUrl.searchParams.set('order', order.id)
    const cancelUrl = new URL(returnUrl)
    cancelUrl.searchParams.set('cancelled', '1')
    const result = await this.request('/checkouts', {
      product_cart: [{ product_id: order.product_id, quantity: 1 }],
      customer: { email: user.email, ...(user.name ? { name: user.name } : {}) },
      billing_currency: order.currency,
      return_url: returnUrl.toString(),
      cancel_url: cancelUrl.toString(),
      feature_flags: {
        allow_discount_code: false,
        allow_currency_selection: false,
        allow_editing_addons: false,
        redirect_immediately: true,
      },
      metadata: {
        app: 'tuneclue',
        order_id: order.id,
        user_id: order.user_id,
        pack_id: order.pack_id,
        environment: order.environment,
      },
    })
    return {
      sessionId: identifier(result.session_id),
      checkoutUrl: validCheckoutUrl(result.checkout_url, this.config),
    }
  }

  retrieveCheckout(sessionId: string) {
    return this.request(`/checkouts/${encodeURIComponent(identifier(sessionId))}`)
  }

  retrievePayment(paymentId: string) {
    return this.request(`/payments/${encodeURIComponent(identifier(paymentId))}`)
  }
}
