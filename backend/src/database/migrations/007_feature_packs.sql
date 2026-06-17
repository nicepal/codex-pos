-- Feature pack remediation: branch stock, catalog pro, tax, staff, CRM

-- Branch-level stock ledger
CREATE TABLE IF NOT EXISTS branch_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_stock_unique
    ON branch_stock (tenant_id, branch_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_branch_stock_tenant_branch ON branch_stock(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_product ON branch_stock(tenant_id, product_id);

ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Open price items
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_open_price BOOLEAN DEFAULT false;

-- Advanced tax
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rule_id UUID REFERENCES tax_rules(id);

-- Catalog Pro: bundles
CREATE TABLE IF NOT EXISTS product_bundle_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bundle_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON product_bundle_items(bundle_product_id);

-- Serial numbers
CREATE TABLE IF NOT EXISTS product_serials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    serial_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'defective')),
    branch_id UUID REFERENCES branches(id),
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, serial_number)
);
CREATE INDEX IF NOT EXISTS idx_product_serials_product ON product_serials(tenant_id, product_id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS tracks_serials BOOLEAN DEFAULT false;

-- Batch tracking
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_batches_unique
    ON product_batches (tenant_id, product_id, batch_number, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(tenant_id, product_id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS tracks_batches BOOLEAN DEFAULT false;

-- Staff shifts
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    drawer_session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant ON shifts(tenant_id);

-- CRM segments (preset segments stored as JSON queries)
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    filter_type VARCHAR(50) NOT NULL,
    filter_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Order item metadata for bundles
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Loyalty settings stored in settings key 'loyalty' — no migration needed

-- Backfill branch_stock from products for default branch per tenant
INSERT INTO branch_stock (tenant_id, branch_id, product_id, variant_id, quantity)
SELECT p.tenant_id, b.id, p.id, NULL, p.stock_quantity
FROM products p
JOIN LATERAL (
    SELECT id FROM branches WHERE tenant_id = p.tenant_id ORDER BY created_at ASC LIMIT 1
) b ON true
WHERE p.stock_quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM branch_stock bs
    WHERE bs.tenant_id = p.tenant_id AND bs.branch_id = b.id AND bs.product_id = p.id AND bs.variant_id IS NULL
  );

INSERT INTO branch_stock (tenant_id, branch_id, product_id, variant_id, quantity)
SELECT pv.tenant_id, b.id, pv.product_id, pv.id, pv.stock_quantity
FROM product_variants pv
JOIN LATERAL (
    SELECT id FROM branches WHERE tenant_id = pv.tenant_id ORDER BY created_at ASC LIMIT 1
) b ON true
WHERE pv.stock_quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM branch_stock bs
    WHERE bs.tenant_id = pv.tenant_id AND bs.branch_id = b.id AND bs.product_id = pv.product_id AND bs.variant_id = pv.id
  );
