-- Restaurant Phase 3: Kitchen stations, tickets, KDS permissions

-- Permissions
INSERT INTO permissions (name, display_name, module) VALUES
  ('kds.view', 'View Kitchen Display', 'business'),
  ('kds.manage', 'Manage Kitchen Display', 'business')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('business_owner', 'manager')
  AND p.name IN ('kds.view', 'kds.manage')
ON CONFLICT DO NOTHING;

-- kitchen_staff role (if not exists)
INSERT INTO roles (name, display_name, is_platform_role)
VALUES ('kitchen_staff', 'Kitchen Staff', false)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'kitchen_staff'
  AND p.name IN ('kds.view', 'kds.manage', 'restaurant.view')
ON CONFLICT DO NOTHING;

-- Station routing on categories / products
ALTER TABLE categories ADD COLUMN IF NOT EXISTS kitchen_station_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_kitchen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS kitchen_station_id UUID;

-- Kitchen stations
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_stations_tenant_branch
  ON kitchen_stations(tenant_id, branch_id);

ALTER TABLE categories
  ADD CONSTRAINT fk_categories_kitchen_station
  FOREIGN KEY (kitchen_station_id) REFERENCES kitchen_stations(id) ON DELETE SET NULL;

ALTER TABLE products
  ADD CONSTRAINT fk_products_kitchen_station
  FOREIGN KEY (kitchen_station_id) REFERENCES kitchen_stations(id) ON DELETE SET NULL;

-- Branch-scoped ticket number counter (concurrency-safe K-1001, K-1002, …)
CREATE TABLE IF NOT EXISTS kitchen_ticket_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 1000,
  PRIMARY KEY (tenant_id, branch_id)
);

CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dining_session_id UUID REFERENCES restaurant_table_sessions(id) ON DELETE SET NULL,
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  ticket_number VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_tenant ON kitchen_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_branch ON kitchen_tickets(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order ON kitchen_tickets(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON kitchen_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_station ON kitchen_tickets(tenant_id, station_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_created ON kitchen_tickets(tenant_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kitchen_tickets_number_branch
  ON kitchen_tickets(tenant_id, branch_id, ticket_number);

CREATE TABLE IF NOT EXISTS kitchen_ticket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kitchen_ticket_id UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_tenant ON kitchen_ticket_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_ticket ON kitchen_ticket_items(tenant_id, kitchen_ticket_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_order_item ON kitchen_ticket_items(tenant_id, order_item_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_status ON kitchen_ticket_items(tenant_id, status);

-- Idempotent ticket item creation (no duplicate on retry)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kitchen_ticket_items_order_item_active
  ON kitchen_ticket_items(tenant_id, order_item_id)
  WHERE status != 'cancelled';

CREATE TRIGGER kitchen_stations_updated_at
  BEFORE UPDATE ON kitchen_stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
