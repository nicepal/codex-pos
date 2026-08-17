-- Restaurant Phase 3 extension: per-item kitchen status + accepted/served ticket states

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS kitchen_status VARCHAR(20);

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_kitchen_status_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_kitchen_status_check
  CHECK (kitchen_status IS NULL OR kitchen_status IN (
    'not_sent', 'sent', 'accepted', 'preparing', 'ready', 'served', 'cancelled'
  ));

CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_status
  ON order_items(tenant_id, order_id, kitchen_status)
  WHERE kitchen_status IS NOT NULL;

-- Extend kitchen ticket status lifecycle (accepted, served)
ALTER TABLE kitchen_tickets DROP CONSTRAINT IF EXISTS kitchen_tickets_status_check;
ALTER TABLE kitchen_tickets ADD CONSTRAINT kitchen_tickets_status_check
  CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'served', 'cancelled'));

ALTER TABLE kitchen_ticket_items DROP CONSTRAINT IF EXISTS kitchen_ticket_items_status_check;
ALTER TABLE kitchen_ticket_items ADD CONSTRAINT kitchen_ticket_items_status_check
  CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'served', 'cancelled'));

-- Normalize legacy completed → served
UPDATE kitchen_tickets SET status = 'served' WHERE status = 'completed';
UPDATE kitchen_ticket_items SET status = 'served' WHERE status = 'completed';
