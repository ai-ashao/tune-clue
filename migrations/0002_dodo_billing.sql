-- Additive migration: existing users, sessions and recognition/free-credit entries are preserved.
CREATE TABLE IF NOT EXISTS billing_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  environment TEXT NOT NULL CHECK (environment IN ('test_mode', 'live_mode')),
  request_key TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0 AND credits <= 10000),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  product_id TEXT NOT NULL,
  return_to TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('creating','pending','checkout_failed','failed','cancelled','paid','partially_refunded','refunded','disputed','review')),
  checkout_session_id TEXT,
  checkout_url TEXT,
  payment_id TEXT,
  paid_amount INTEGER,
  refunded_amount INTEGER NOT NULL DEFAULT 0,
  target_credits INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  paid_at INTEGER,
  last_reconcile_at INTEGER NOT NULL DEFAULT 0,
  review_reason TEXT,
  UNIQUE (user_id, environment, request_key),
  UNIQUE (environment, checkout_session_id),
  UNIQUE (environment, payment_id)
);
CREATE INDEX IF NOT EXISTS idx_billing_orders_user ON billing_orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_events (
  environment TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  order_id TEXT REFERENCES billing_orders(id),
  state TEXT NOT NULL CHECK (state IN ('pending','processed','ignored','review')),
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  reason TEXT,
  PRIMARY KEY (environment, event_id)
);
CREATE INDEX IF NOT EXISTS idx_billing_events_pending ON billing_events(state, received_at);

CREATE TABLE IF NOT EXISTS billing_refunds (
  environment TEXT NOT NULL,
  refund_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES billing_orders(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  PRIMARY KEY (environment, refund_id)
);
CREATE INDEX IF NOT EXISTS idx_billing_refunds_order ON billing_refunds(order_id);

CREATE TABLE IF NOT EXISTS billing_disputes (
  environment TEXT NOT NULL,
  dispute_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES billing_orders(id),
  status TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  PRIMARY KEY (environment, dispute_id)
);
CREATE INDEX IF NOT EXISTS idx_billing_disputes_order ON billing_disputes(order_id);

-- Test checkouts NEVER write to the spendable credit_transactions ledger.
CREATE TABLE IF NOT EXISTS billing_test_credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  delta INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase','adjustment')),
  reference_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_test_credits_user ON billing_test_credit_transactions(user_id);

-- Prevent a racing callback or mismatched second payment from rebinding an existing order.
CREATE TRIGGER IF NOT EXISTS billing_payment_identity_immutable
BEFORE UPDATE OF payment_id ON billing_orders
WHEN OLD.payment_id IS NOT NULL AND NEW.payment_id IS NOT OLD.payment_id
BEGIN SELECT RAISE(ABORT, 'billing payment identity is immutable'); END;

CREATE TRIGGER IF NOT EXISTS billing_session_identity_immutable
BEFORE UPDATE OF checkout_session_id ON billing_orders
WHEN OLD.checkout_session_id IS NOT NULL AND NEW.checkout_session_id IS NOT OLD.checkout_session_id
BEGIN SELECT RAISE(ABORT, 'billing session identity is immutable'); END;

CREATE TRIGGER IF NOT EXISTS billing_refund_identity_immutable
BEFORE UPDATE ON billing_refunds
BEGIN SELECT RAISE(ABORT, 'succeeded refunds are append-only'); END;

CREATE TRIGGER IF NOT EXISTS billing_paid_amount_immutable
BEFORE UPDATE OF paid_amount ON billing_orders
WHEN OLD.paid_amount IS NOT NULL AND NEW.paid_amount IS NOT OLD.paid_amount
BEGIN SELECT RAISE(ABORT, 'billing paid amount is immutable'); END;

CREATE TRIGGER IF NOT EXISTS billing_dispute_identity_immutable
BEFORE UPDATE OF order_id ON billing_disputes
WHEN NEW.order_id IS NOT OLD.order_id
BEGIN SELECT RAISE(ABORT, 'billing dispute identity is immutable'); END;
