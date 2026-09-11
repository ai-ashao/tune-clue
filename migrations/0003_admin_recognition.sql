-- Additive only. No user, payment, or credit ledger is replaced or cleared.
CREATE TABLE recognition_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  request_key TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('local_file','tiktok_url')),
  payload_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','matched','no_match','system_error','indeterminate','rejected')),
  stage TEXT NOT NULL CHECK (stage IN ('accepted','charged','source','provider','persisted','finished')),
  provider TEXT NOT NULL DEFAULT 'audd' CHECK (provider = 'audd'),
  provider_call_count INTEGER NOT NULL DEFAULT 0 CHECK (provider_call_count >= 0),
  estimated_unit_cost_microusd INTEGER CHECK (estimated_unit_cost_microusd >= 0),
  error_code TEXT,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  result_json TEXT CHECK (result_json IS NULL OR length(result_json) <= 16384),
  result_expires_at INTEGER,
  resolution TEXT CHECK (resolution IN ('auto_credit_return','manual_credit_return')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  execution_deadline_at INTEGER NOT NULL,
  finished_at INTEGER,
  UNIQUE(user_id, request_key)
);
CREATE INDEX idx_recognition_user_time ON recognition_attempts(user_id, created_at DESC, id DESC);
CREATE INDEX idx_recognition_status_time ON recognition_attempts(status, created_at DESC, id DESC);
CREATE INDEX idx_recognition_time ON recognition_attempts(created_at DESC, id DESC);

CREATE TABLE admin_operations (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id),
  request_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('reconcile_order','return_recognition_credit')),
  target_type TEXT NOT NULL CHECK (target_type IN ('order','recognition')),
  target_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('test_mode','live_mode','spendable')),
  payload_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('running','succeeded','no_change','review','failed')),
  reason_code TEXT NOT NULL,
  reason_text TEXT NOT NULL CHECK (length(reason_text) BETWEEN 5 AND 500),
  result_json TEXT CHECK (result_json IS NULL OR length(result_json) <= 16384),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  lease_until INTEGER NOT NULL,
  lease_token TEXT NOT NULL,
  UNIQUE(admin_user_id, request_id)
);
CREATE INDEX idx_admin_operations_rate ON admin_operations(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_operations_target ON admin_operations(target_type, target_id, created_at DESC, id DESC);

CREATE TABLE admin_audit_logs (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL REFERENCES admin_operations(id),
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  event_kind TEXT NOT NULL CHECK (event_kind IN ('started','succeeded','no_change','review','failed')),
  target_type TEXT NOT NULL CHECK (target_type IN ('order','recognition')),
  target_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('test_mode','live_mode','spendable')),
  reason_code TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  result_code TEXT,
  trace_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(operation_id, event_kind)
);
CREATE INDEX idx_admin_audit_target ON admin_audit_logs(target_type, target_id, created_at DESC, id DESC);
CREATE TRIGGER admin_audit_no_update BEFORE UPDATE ON admin_audit_logs
BEGIN SELECT RAISE(ABORT, 'admin audit records are append-only'); END;
CREATE TRIGGER admin_audit_no_delete BEFORE DELETE ON admin_audit_logs
BEGIN SELECT RAISE(ABORT, 'admin audit records are append-only'); END;

CREATE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_users_admin_time ON users(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_billing_admin_time ON billing_orders(environment, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_billing_admin_issue ON billing_orders(environment, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_event_order ON billing_events(order_id, received_at DESC, event_id DESC);
CREATE INDEX IF NOT EXISTS idx_credit_reference ON credit_transactions(reference_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_test_credit_reference ON billing_test_credit_transactions(reference_id, idempotency_key);
