CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY,
 plan_id TEXT NOT NULL,
 plan_name TEXT NOT NULL,
 price_sar REAL NOT NULL,
 duration_days INTEGER NOT NULL,
 discord_username TEXT NOT NULL,
 email TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','delivered','cancelled')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS customers (
  email TEXT PRIMARY KEY,
  first_name TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS customer_login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_login_codes_email_created ON customer_login_codes(email, created_at DESC);
CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_email ON customer_sessions(email);
CREATE TABLE IF NOT EXISTS order_status_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','paid','delivered','cancelled')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_status_events_order_created ON order_status_events(order_id, created_at ASC);

CREATE TABLE IF NOT EXISTS invoice_email_jobs (
  order_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invoice_email_jobs_status_attempt ON invoice_email_jobs(status, last_attempt_at);
