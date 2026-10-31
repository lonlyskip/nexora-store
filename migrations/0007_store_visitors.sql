CREATE TABLE IF NOT EXISTS store_visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_store_visitors_first_seen ON store_visitors(first_seen_at);
