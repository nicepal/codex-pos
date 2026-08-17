-- Restaurant Pro Phase 1: floors, tables, dining sessions, permissions

-- Permissions
INSERT INTO permissions (name, display_name, module) VALUES
  ('restaurant.view', 'View Restaurant', 'business'),
  ('restaurant.manage', 'Manage Restaurant', 'business'),
  ('restaurant.tables.view', 'View Restaurant Tables', 'business'),
  ('restaurant.tables.manage', 'Manage Restaurant Tables', 'business'),
  ('restaurant.settings.manage', 'Manage Restaurant Settings', 'business')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('business_owner', 'manager')
  AND p.name IN (
    'restaurant.view',
    'restaurant.manage',
    'restaurant.tables.view',
    'restaurant.tables.manage',
    'restaurant.settings.manage'
  )
ON CONFLICT DO NOTHING;

-- Floors
CREATE TABLE IF NOT EXISTS restaurant_floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_floors_tenant_branch
  ON restaurant_floors(tenant_id, branch_id);

-- Tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES restaurant_floors(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2 CHECK (capacity > 0),
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  shape VARCHAR(20) NOT NULL DEFAULT 'square'
    CHECK (shape IN ('square', 'round', 'rectangle')),
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_branch
  ON restaurant_tables(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_floor
  ON restaurant_tables(tenant_id, floor_id);

-- Dining sessions
CREATE TABLE IF NOT EXISTS restaurant_table_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_sessions_tenant_branch
  ON restaurant_table_sessions(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_sessions_table_open
  ON restaurant_table_sessions(tenant_id, table_id)
  WHERE status = 'open';

-- Orders: restaurant dining linkage (nullable — retail POS unchanged)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dining_session_id UUID
  REFERENCES restaurant_table_sessions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id UUID
  REFERENCES restaurant_tables(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_count INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS server_employee_id UUID
  REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchen_status VARCHAR(20)
  CHECK (kitchen_status IS NULL OR kitchen_status IN ('pending', 'in_progress', 'ready', 'served', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_orders_dining_session ON orders(dining_session_id)
  WHERE dining_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id)
  WHERE table_id IS NOT NULL;

-- updated_at triggers
CREATE TRIGGER restaurant_floors_updated_at
  BEFORE UPDATE ON restaurant_floors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER restaurant_tables_updated_at
  BEFORE UPDATE ON restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER restaurant_table_sessions_updated_at
  BEFORE UPDATE ON restaurant_table_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
