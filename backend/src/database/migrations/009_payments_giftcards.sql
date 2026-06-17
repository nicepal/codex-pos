-- Roadmap: real payments, gift cards / store credit, tips

-- Track real gateway payment intents on checkout sessions
ALTER TABLE payment_checkout_sessions ADD COLUMN IF NOT EXISTS provider VARCHAR(40) DEFAULT 'stub';
ALTER TABLE payment_checkout_sessions ADD COLUMN IF NOT EXISTS provider_payment_intent VARCHAR(255);
ALTER TABLE payment_checkout_sessions ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE payment_checkout_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Tips / gratuity + gateway reference on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);

-- Idempotency key for offline POS sync (prevents duplicate orders on retry)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_order_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_order_id
  ON orders(tenant_id, client_order_id) WHERE client_order_id IS NOT NULL;

-- Gift cards / store credit
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(40) NOT NULL,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- issue | redeem | refund | adjust
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant ON gift_cards(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_card_tx_card ON gift_card_transactions(gift_card_id);
