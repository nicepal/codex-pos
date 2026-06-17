-- Expenses module enhancements for financial dashboard

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_number VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'paid';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(tenant_id, supplier_name);

UPDATE expenses SET status = 'paid' WHERE status IS NULL;
UPDATE expenses SET payment_method = 'cash' WHERE payment_method IS NULL;
