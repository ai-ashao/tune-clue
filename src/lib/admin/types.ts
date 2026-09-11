import type { BillingDb } from '../billing/types'

export type AdminConfig = {
  enabled: boolean
  writeEnabled: boolean
  userIds: string[]
  origin: string
  deployment: string
}
export type AdminIdentity = {
  id: string
  email: string
  name: string | null
  sessionCreatedAt: number
}
export type AdminContext = {
  db: BillingDb
  admin: AdminIdentity
  config: AdminConfig
  traceId: string
}
export type Page<T> = { items: T[]; nextCursor: string | null }
export type Ledger = 'spendable' | 'test'
export type Environment = 'live_mode' | 'test_mode' | 'all'
export type AdminAction = 'reconcile_order' | 'return_recognition_credit'
export type TargetType = 'order' | 'recognition'
export type OperationState = 'running' | 'succeeded' | 'no_change' | 'review' | 'failed'
export type ActionInput = {
  requestId: string
  reasonCode: string
  reasonText: string
  confirmedUnresolved?: boolean
}
export type Operation = {
  id: string
  admin_user_id: string
  request_id: string
  action: AdminAction
  target_type: TargetType
  target_id: string
  environment: 'live_mode' | 'test_mode' | 'spendable'
  payload_hash: string
  state: OperationState
  reason_code: string
  reason_text: string
  result_json: string | null
  created_at: number
  updated_at: number
  completed_at: number | null
  lease_until: number
  lease_token: string
}
export type OperationResult = {
  operationId: string
  state: OperationState
  outcome: string
  returnedCredits?: number
  currentBalance?: number
  retryAfter?: number
  orderId?: string
}
export type UserView = {
  id: string
  email: string
  name: string | null
  created_at: number
  balance: number
  test_balance: number
  last_recognition_at: number | null
  legacy_attempts?: number
}
export type CreditView = {
  id: string
  user_id: string
  delta: number
  type: string
  reference_id: string | null
  idempotency_key: string
  created_at: number
  has_attempt: number
}
export type OrderView = {
  id: string
  user_id: string
  environment: 'live_mode' | 'test_mode'
  pack_name: string
  credits: number
  amount: number
  currency: string
  status: string
  checkout_session_id: string | null
  payment_id: string | null
  paid_amount: number | null
  refunded_amount: number
  target_credits: number
  created_at: number
  updated_at: number
  paid_at: number | null
  last_reconcile_at: number
  review_reason: string | null
  ledger_net: number
  consistency: 'not_granted' | 'consistent' | 'missing' | 'excess' | 'unexpected'
  user_balance?: number
}
export type EventView = {
  event_id: string
  event_type: string
  environment: string
  order_id: string | null
  state: string
  received_at: number
  processed_at: number | null
  reason: string | null
  active: number
  covering_event_id: string | null
  covered_at: number | null
}
export type RecognitionView = {
  id: string
  user_id: string
  source_kind: string
  status: string
  effective_status: string
  stage: string
  provider: string
  provider_call_count: number
  estimated_unit_cost_microusd: number | null
  error_code: string | null
  duration_ms: number | null
  resolution: string | null
  created_at: number
  updated_at: number
  execution_deadline_at: number
  finished_at: number | null
  charged: number
  returned: number
  eligibility?: { allowed: boolean; needsConfirmation: boolean; reason: string }
}
export type AuditView = {
  id: string
  operation_id: string
  actor_user_id: string
  event_kind: string
  target_type: string
  target_id: string
  environment: string
  reason_code: string
  reason_text: string
  before_json: string | null
  after_json: string | null
  result_code: string | null
  trace_id: string
  created_at: number
}
export type Overview = {
  range: string
  from: number
  to: number
  newUsers: number
  confirmedLiveOrders: number
  recognitions: number | null
  openIssues: number
  groups: { orders: number; events: number; entitlements: number; recognitions: number }
  quality: {
    matched: number
    no_match: number
    system_error: number
    indeterminate: number
    running: number
    average_ms: number | null
  } | null
}
export class AdminError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(code)
    this.name = 'AdminError'
  }
}
