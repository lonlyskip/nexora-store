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
