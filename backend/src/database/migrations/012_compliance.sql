-- Roadmap: e-invoicing / fiscal compliance + GDPR tooling

-- Sequential fiscal tax invoices generated from orders
CREATE TABLE IF NOT EXISTS order_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(60) NOT NULL,
  sequence INTEGER NOT NULL,
  seller_tax_id VARCHAR(80),
  buyer_name VARCHAR(255),
  buyer_tax_id VARCHAR(80),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  hash VARCHAR(128),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, order_id),
  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_order_invoices_tenant ON order_invoices(tenant_id, sequence);

-- Buyer tax id for B2B fiscal invoices
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(80);

-- Consent tracking for storefront customers (GDPR)
ALTER TABLE storefront_customers ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE storefront_customers ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ;

-- Audit trail of GDPR data requests
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID,
  type VARCHAR(20) NOT NULL, -- export | erase
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
