-- Roadmap: Shopify catalog import/sync integration (GraphQL Admin API)

-- One Shopify store connection per tenant
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_name VARCHAR(255),
  shop_url VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,           -- AES-256-GCM encrypted
  api_version VARCHAR(20) DEFAULT '2024-10',
  scopes TEXT,
  status VARCHAR(20) DEFAULT 'connected', -- connected | disconnected | error
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_full_import_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_connections_tenant ON shopify_connections(tenant_id);

-- Import / sync job history and live progress
CREATE TABLE IF NOT EXISTS shopify_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES shopify_connections(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'full',     -- full | incremental
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued | running | completed | failed
  progress INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{}'::jsonb,
  totals JSONB DEFAULT '{}'::jsonb,             -- {products_imported, products_updated, variants_imported, images_imported, collections_imported, errors}
  error_log JSONB DEFAULT '[]'::jsonb,
  message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_jobs_tenant ON shopify_import_jobs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_jobs_status ON shopify_import_jobs(tenant_id, status);

-- Matching maps (avoid duplicates / enable incremental sync)
CREATE TABLE IF NOT EXISTS shopify_product_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
  shopify_product_id VARCHAR(64) NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  handle VARCHAR(255),
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, shopify_product_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_product_map_product ON shopify_product_map(product_id);

CREATE TABLE IF NOT EXISTS shopify_variant_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shopify_variant_id VARCHAR(64) NOT NULL,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, shopify_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_variant_map_variant ON shopify_variant_map(variant_id);

CREATE TABLE IF NOT EXISTS shopify_collection_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shopify_collection_id VARCHAR(64) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, shopify_collection_id)
);

-- Catalog columns to faithfully store Shopify data
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12,2);
