-- Roadmap: product reviews, storefront customer accounts, marketplace sync

-- Storefront customer accounts (separate from POS `customers` CRM records)
CREATE TABLE IF NOT EXISTS storefront_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(120),
  last_name VARCHAR(120),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS storefront_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storefront_customer_id UUID NOT NULL REFERENCES storefront_customers(id) ON DELETE CASCADE,
  label VARCHAR(80),
  line1 VARCHAR(255),
  line2 VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  postal_code VARCHAR(40),
  country VARCHAR(120),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storefront_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storefront_customer_id UUID NOT NULL REFERENCES storefront_customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (storefront_customer_id, product_id)
);

-- Product reviews & ratings
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storefront_customer_id UUID REFERENCES storefront_customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  author_name VARCHAR(160) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  body TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(tenant_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON product_reviews(tenant_id, status);

-- Marketplace / social commerce integrations
CREATE TABLE IF NOT EXISTS marketplace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(40) NOT NULL, -- amazon | ebay | instagram | tiktok | google
  display_name VARCHAR(120),
  status VARCHAR(20) DEFAULT 'connected',
  credentials JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20),
  last_sync_message TEXT,
  synced_product_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, channel)
);
