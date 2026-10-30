CREATE TABLE IF NOT EXISTS order_status_email_jobs (
  order_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','paid','delivered','cancelled')),
  event_id TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY(order_id,status),
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(event_id) REFERENCES order_status_events(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_status_email_jobs_status_attempt
  ON order_status_email_jobs(status,last_attempt_at);