-- Roadmap: Super Admin SMTP Management Module
-- Global SMTP configuration (DB-managed, encrypted password) + email delivery logs.

-- ============================================================
-- SMTP SETTINGS (global singleton, future tenant-ready)
-- ============================================================
CREATE TABLE IF NOT EXISTS smtp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,   -- NULL = global config
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username VARCHAR(255),
  password_encrypted TEXT,                                   -- AES-256-GCM
  encryption VARCHAR(10) NOT NULL DEFAULT 'tls' CHECK (encryption IN ('ssl', 'tls', 'none')),
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_to_email VARCHAR(255),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One config per tenant; one global row (tenant_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_smtp_settings_tenant ON smtp_settings(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_smtp_settings_global ON smtp_settings((tenant_id IS NULL)) WHERE tenant_id IS NULL;

-- ============================================================
-- EMAIL LOGS (delivery history + failure reasons)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  template_slug VARCHAR(100),
  type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_message_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);

-- updated_at trigger for smtp_settings (function defined in earlier migrations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS smtp_settings_updated_at ON smtp_settings;
    CREATE TRIGGER smtp_settings_updated_at BEFORE UPDATE ON smtp_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
