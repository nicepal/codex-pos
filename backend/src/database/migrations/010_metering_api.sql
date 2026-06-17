-- Roadmap: usage metering + public developer API keys

-- Per-tenant usage counters (storage is tracked incrementally on upload)
CREATE TABLE IF NOT EXISTS tenant_usage (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  storage_bytes BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Developer API keys for the public API
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  key_hash VARCHAR(128) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Request log for rate-limit accounting / debugging (lightweight)
CREATE TABLE IF NOT EXISTS api_request_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  method VARCHAR(10),
  path VARCHAR(255),
  status_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_tenant_time ON api_request_logs(tenant_id, created_at);
