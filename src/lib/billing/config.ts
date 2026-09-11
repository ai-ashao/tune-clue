import type { BillingConfig, CreditPack, PublicCatalog } from './types'
import { BillingError, identifier, integer, object } from './types'

function enabled(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === 'true'
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function parseBillingConfig(env: Record<string, unknown>): BillingConfig {
  const environment = text(env.DODO_PAYMENTS_ENVIRONMENT) || 'test_mode'
  if (environment !== 'test_mode' && environment !== 'live_mode') {
    throw new BillingError('billing-config', 'Invalid Dodo environment.', 503)
  }
  const siteUrl = new URL(text(env.BILLING_SITE_URL) || 'https://tuneclue.com')
  const local = ['localhost', '127.0.0.1'].includes(siteUrl.hostname)
  if (
    siteUrl.username ||
    siteUrl.password ||
    siteUrl.pathname !== '/' ||
    siteUrl.search ||
    siteUrl.hash ||
    (siteUrl.protocol !== 'https:' &&
      !(environment === 'test_mode' && local && siteUrl.protocol === 'http:'))
  ) {
    throw new BillingError('billing-config', 'BILLING_SITE_URL must be a trusted site origin.', 503)
  }
  let data: unknown
  try {
    data = JSON.parse(text(env.DODO_CREDIT_PACKS_JSON) || '[]')
  } catch {
    throw new BillingError('billing-config', 'DODO_CREDIT_PACKS_JSON must be valid JSON.', 503)
  }
  if (!Array.isArray(data) || data.length > 5) {
    throw new BillingError('billing-config', 'Configure up to five credit packs.', 503)
  }
  const packs: CreditPack[] = data.map((value) => {
    const item = object(value)
    const name = text(item.name)
    if (!name || name.length > 60 || item.currency !== 'USD') {
      throw new BillingError('billing-config', 'Credit packs need a name and USD pricing.', 503)
    }
    return {
      id: identifier(item.id),
      name,
      credits: integer(item.credits, 1, 10_000),
      amount: integer(item.amount, 100, 100_000),
      currency: 'USD',
      productId: identifier(item.productId),
    }
  })
  if (
    new Set(packs.map((p) => p.id)).size !== packs.length ||
    new Set(packs.map((p) => p.productId)).size !== packs.length
  ) {
    throw new BillingError('billing-config', 'Pack IDs and product IDs must be unique.', 503)
  }
  return {
    enabled: enabled(env.BILLING_ENABLED),
    liveApproved: enabled(env.DODO_LIVE_PAYMENTS_APPROVED),
    environment,
    siteUrl: siteUrl.origin,
    apiKey: text(env.DODO_PAYMENTS_API_KEY),
    webhookKey: text(env.DODO_PAYMENTS_WEBHOOK_KEY),
    businessId: text(env.DODO_PAYMENTS_BUSINESS_ID),
    packs,
  }
}

export function providerReady(config: BillingConfig): boolean {
  return Boolean(config.apiKey && config.webhookKey && config.businessId)
}

export function checkoutAvailable(config: BillingConfig): boolean {
  return (
    config.enabled &&
    providerReady(config) &&
    config.packs.length > 0 &&
    (config.environment === 'test_mode' || config.liveApproved)
  )
}

export function catalog(config: BillingConfig): PublicCatalog {
  const available = checkoutAvailable(config)
  return {
    available,
    environment: config.environment,
    packs: available ? config.packs.map(({ productId: _productId, ...pack }) => pack) : [],
  }
}

export function safeReturnTo(value: unknown): string {
  // Not a generic redirect validator: only actual TuneClue destinations are accepted.
  return typeof value === 'string' &&
    ['/', '/account', '/earn-credits', '/identify?purchase_resume=1'].includes(value)
    ? value
    : '/account'
}
