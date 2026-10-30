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
