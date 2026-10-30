ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'paypal' CHECK(payment_method IN ('paypal','bank_transfer'));
CREATE INDEX IF NOT EXISTS idx_orders_pending_paypal_expiry ON orders(status,payment_method,created_at);
