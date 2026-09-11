export type BillingEnvironment = 'test_mode' | 'live_mode'

export type CreditPack = {
  id: string
  name: string
  credits: number
  amount: number
  currency: 'USD'
  productId: string
}

export type PublicCreditPack = Omit<CreditPack, 'productId'>

export type BillingConfig = {
  enabled: boolean
  liveApproved: boolean
  environment: BillingEnvironment
  siteUrl: string
  apiKey: string
  webhookKey: string
  businessId: string
  packs: CreditPack[]
}

// The small structural interface also lets the exact SQL run in SQLite acceptance tests.
export interface BillingStatement {
  bind(...values: unknown[]): BillingStatement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<{ meta: { changes?: number } }>
}

export interface BillingDb {
  prepare(sql: string): BillingStatement
  batch(statements: BillingStatement[]): Promise<unknown[]>
}

export type BillingUser = { id: string; email: string; name?: string }

export type OrderStatus =
  | 'creating'
  | 'pending'
  | 'checkout_failed'
  | 'failed'
  | 'cancelled'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'disputed'
  | 'review'

export type BillingOrder = {
  id: string
  user_id: string
  environment: BillingEnvironment
  request_key: string
  pack_id: string
  pack_name: string
  credits: number
  amount: number
  currency: 'USD'
  product_id: string
  return_to: string
  status: OrderStatus
  checkout_session_id: string | null
  checkout_url: string | null
  payment_id: string | null
  paid_amount: number | null
  refunded_amount: number
  target_credits: number
  created_at: number
  updated_at: number
  paid_at: number | null
  last_reconcile_at: number
  review_reason: string | null
}

export type PublicOrder = {
  id: string
  environment: BillingEnvironment
  packName: string
  credits: number
  amount: number
  paidAmount: number | null
  currency: 'USD'
  status: OrderStatus
  refundedAmount: number
  retainedCredits: number
  createdAt: number
  returnTo: string
}

export type PublicCatalog = {
  available: boolean
  environment: BillingEnvironment
  packs: PublicCreditPack[]
}

export class BillingError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'BillingError'
    this.code = code
    this.status = status
  }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BillingError('invalid-payload', 'Invalid payment data.', 400)
  }
  return value as Record<string, unknown>
}

export function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new BillingError('invalid-id', 'Invalid payment identifier.', 400)
  }
  return value
}

export function integer(value: unknown, min = 0, max = 100_000_000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new BillingError('invalid-amount', 'Invalid payment amount.', 400)
  }
  return value
}

export function publicOrder(order: BillingOrder): PublicOrder {
  return {
    id: order.id,
    environment: order.environment,
    packName: order.pack_name,
    credits: order.credits,
    amount: order.amount,
    paidAmount: order.paid_amount,
    currency: order.currency,
    status: order.status,
    refundedAmount: order.refunded_amount,
    retainedCredits: order.target_credits,
    createdAt: order.created_at,
    returnTo: order.return_to,
  }
}
