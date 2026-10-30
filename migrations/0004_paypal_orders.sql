ALTER TABLE orders ADD COLUMN paypal_order_id TEXT;
ALTER TABLE orders ADD COLUMN paypal_capture_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paypal_capture_id ON orders(paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;
