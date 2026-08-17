-- CodexPOS register: auditable cash drawer movements (cash in / cash out)
-- Used by POS cash management and expected-cash reconciliation.

CREATE TABLE IF NOT EXISTS cash_drawer_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES cash_drawer_sessions(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('cash_in', 'cash_out')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_drawer_movements_session
  ON cash_drawer_movements(tenant_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_drawer_movements_tenant
  ON cash_drawer_movements(tenant_id, created_at DESC);
