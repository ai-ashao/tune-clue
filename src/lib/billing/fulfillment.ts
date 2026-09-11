import type { PaymentSnapshot } from './payment'
import { PaymentReviewError } from './payment'
import { ledgerTable } from './store'
import type { BillingDb, BillingEnvironment, BillingOrder, BillingStatement } from './types'

export type EventReference = { id: string; type: string; occurredAt: number }

// Server-only transaction extension. Callers cannot supply this through HTTP.
// Admin uses it to commit business writes and the operation's audit atomically.
export type BillingCommit = {
  before: () => BillingStatement[]
  after: (outcome: string) => BillingStatement[]
}
export async function commitWithoutPayment(
  db: BillingDb,
  commit: BillingCommit | undefined,
  outcome: string,
) {
  if (commit) await db.batch([...commit.before(), ...commit.after(outcome)])
}

export async function eventState(db: BillingDb, environment: BillingEnvironment, id: string) {
  return db
    .prepare('SELECT state FROM billing_events WHERE environment = ? AND event_id = ?')
    .bind(environment, id)
    .first<{ state: string }>()
}

export async function recordEvent(
  db: BillingDb,
  environment: BillingEnvironment,
  event: EventReference,
  state: 'pending' | 'ignored' | 'review',
  orderId: string | null = null,
  reason: string | null = null,
) {
  await db
    .prepare(`INSERT INTO billing_events
    (environment, event_id, event_type, order_id, state, received_at, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(environment, event_id) DO UPDATE SET state = excluded.state,
      order_id = COALESCE(excluded.order_id, billing_events.order_id), reason = excluded.reason
    WHERE billing_events.state NOT IN ('processed','ignored')`)
    .bind(environment, event.id, event.type, orderId, state, Date.now(), reason)
    .run()
}

export async function recordReview(
  db: BillingDb,
  order: BillingOrder,
  event: EventReference,
  reason: string,
  commit?: BillingCommit,
) {
  await db.batch([
    ...(commit?.before() || []),
    db
      .prepare(
        "UPDATE billing_orders SET status = 'review', review_reason = ?, updated_at = ? WHERE id = ?",
      )
      .bind(reason, Date.now(), order.id),
    db
      .prepare(`INSERT INTO billing_events (environment, event_id, event_type, order_id, state, received_at, reason)
      VALUES (?, ?, ?, ?, 'review', ?, ?)
      ON CONFLICT(environment, event_id) DO UPDATE SET state = 'review', reason = excluded.reason`)
      .bind(order.environment, event.id, event.type, order.id, Date.now(), reason),
    ...(commit?.after('review_required') || []),
  ])
}

// All entitlement changes and event acknowledgement commit in ONE D1 batch transaction.
// Refund rows are monotonic: a stale payment snapshot cannot restore refunded credits.
export async function fulfillPayment(
  db: BillingDb,
  order: BillingOrder,
  payment: PaymentSnapshot,
  event: EventReference,
  commit?: BillingCommit,
) {
  const now = Date.now()
  const environment = order.environment
  const table = ledgerTable(environment)
  const statements: BillingStatement[] = []
  if (payment.status !== 'succeeded') {
    const state = ['failed', 'cancelled'].includes(payment.status) ? payment.status : 'pending'
    statements.push(
      db
        .prepare(`UPDATE billing_orders SET status = ?, updated_at = ?
      WHERE id = ? AND paid_at IS NULL AND status NOT IN ('review','paid','refunded','partially_refunded','disputed')`)
        .bind(state, now, order.id),
    )
  } else {
    // Do not let conflicting refund IDs silently become another order's refunds.
    for (const refund of payment.refunds) {
      const existing = await db
        .prepare(
          'SELECT order_id, amount, currency FROM billing_refunds WHERE environment = ? AND refund_id = ?',
        )
        .bind(environment, refund.id)
        .first<{ order_id: string; amount: number; currency: string }>()
      if (
        existing &&
        (existing.order_id !== order.id ||
          existing.amount !== refund.amount ||
          existing.currency !== refund.currency)
      ) {
        throw new PaymentReviewError('refund-conflict')
      }
    }
    for (const dispute of payment.disputes) {
      const existing = await db
        .prepare('SELECT order_id FROM billing_disputes WHERE environment = ? AND dispute_id = ?')
        .bind(environment, dispute.id)
        .first<{ order_id: string }>()
      if (existing && existing.order_id !== order.id)
        throw new PaymentReviewError('dispute-conflict')
    }
    statements.push(
      db
        .prepare(`UPDATE billing_orders SET payment_id = ?, checkout_session_id = ?, paid_amount = ?,
      paid_at = COALESCE(paid_at, ?), updated_at = ?, review_reason = NULL WHERE id = ?`)
        .bind(payment.id, payment.sessionId, payment.amount, now, now, order.id),
    )
    statements.push(
      db
        .prepare(`INSERT INTO ${table}
      (id, user_id, delta, type, reference_id, idempotency_key, created_at)
      VALUES (?, ?, ?, 'purchase', ?, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING`)
        .bind(
          crypto.randomUUID(),
          order.user_id,
          order.credits,
          order.id,
          `dodo:purchase:${environment}:${order.id}`,
          now,
        ),
    )
    for (const refund of payment.refunds) {
      statements.push(
        db
          .prepare(`INSERT INTO billing_refunds (environment, refund_id, order_id, amount, currency)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(environment, refund_id) DO NOTHING`)
          .bind(environment, refund.id, order.id, refund.amount, refund.currency),
      )
    }
    for (const dispute of payment.disputes) {
      statements.push(
        db
          .prepare(`INSERT INTO billing_disputes (environment, dispute_id, order_id, status, observed_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(environment, dispute_id) DO UPDATE SET status = excluded.status, observed_at = excluded.observed_at
        WHERE billing_disputes.order_id = excluded.order_id AND billing_disputes.observed_at <= excluded.observed_at
        AND (billing_disputes.status NOT IN ('dispute_won','dispute_lost','dispute_accepted','dispute_expired','dispute_cancelled')
             OR billing_disputes.status = excluded.status)`)
          .bind(environment, dispute.id, order.id, dispute.status, event.occurredAt),
      )
    }
    statements.push(
      db
        .prepare(`UPDATE billing_orders SET
      refunded_amount = MIN(paid_amount, COALESCE((SELECT SUM(amount) FROM billing_refunds WHERE order_id = billing_orders.id), 0))
      WHERE id = ?`)
        .bind(order.id),
    )
    // Integer arithmetic: cumulative rounding, not a fresh round-up for every partial refund.
    // The SQL delta is authoritative for idempotency, including concurrent delivery of
    // the same event with newer canonical provider data. Each nonzero adjustment gets a new ID.
    statements.push(
      db
        .prepare(`UPDATE billing_orders SET target_credits = CASE
      WHEN EXISTS (SELECT 1 FROM billing_disputes WHERE order_id = billing_orders.id
                   AND status NOT IN ('dispute_won','dispute_cancelled')) THEN 0
      ELSE MAX(0, credits - (credits * refunded_amount + paid_amount - 1) / paid_amount)
      END WHERE id = ?`)
        .bind(order.id),
    )
    statements.push(
      db
        .prepare(`INSERT INTO ${table}
      (id, user_id, delta, type, reference_id, idempotency_key, created_at)
      SELECT ?, user_id, target_credits - COALESCE((SELECT SUM(delta) FROM ${table}
        WHERE reference_id = billing_orders.id AND idempotency_key LIKE 'dodo:%'), 0),
        'adjustment', id, ?, ? FROM billing_orders
      WHERE id = ? AND target_credits != COALESCE((SELECT SUM(delta) FROM ${table}
        WHERE reference_id = billing_orders.id AND idempotency_key LIKE 'dodo:%'), 0)
      ON CONFLICT(idempotency_key) DO NOTHING`)
        .bind(
          crypto.randomUUID(),
          `dodo:adjust:${environment}:${order.id}:${crypto.randomUUID()}`,
          now,
          order.id,
        ),
    )
    statements.push(
      db
        .prepare(`UPDATE billing_orders SET status = CASE
      WHEN EXISTS (SELECT 1 FROM billing_disputes WHERE order_id = billing_orders.id
                   AND status NOT IN ('dispute_won','dispute_cancelled')) THEN 'disputed'
      WHEN refunded_amount >= paid_amount THEN 'refunded'
      WHEN refunded_amount > 0 THEN 'partially_refunded'
      ELSE 'paid' END WHERE id = ?`)
        .bind(order.id),
    )
  }
  statements.push(
    db
      .prepare(`INSERT INTO billing_events
    (environment, event_id, event_type, order_id, state, received_at, processed_at)
    VALUES (?, ?, ?, ?, 'processed', ?, ?)
    ON CONFLICT(environment, event_id) DO UPDATE SET state = 'processed', order_id = excluded.order_id,
      processed_at = excluded.processed_at, reason = NULL`)
      .bind(environment, event.id, event.type, order.id, now, now),
  )
  await db.batch([
    ...(commit?.before() || []),
    ...statements,
    ...(commit?.after(payment.status === 'succeeded' ? 'applied' : 'payment_not_ready') || []),
  ])
}
