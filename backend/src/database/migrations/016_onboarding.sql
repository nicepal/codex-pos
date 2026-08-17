-- Smart business onboarding: business type + onboarding status on tenants
-- Existing tenants default to completed so they are not forced through the wizard.
-- New registrations set onboarding_status = 'not_started' in auth.service.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) DEFAULT 'completed';

-- Backfill any NULL statuses to completed (treat as already set up)
UPDATE tenants
SET onboarding_status = 'completed'
WHERE onboarding_status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_onboarding_status_check'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_onboarding_status_check
      CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed', 'skipped', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_business_type_check'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_business_type_check
      CHECK (
        business_type IS NULL OR business_type IN (
          'retail', 'restaurant', 'grocery', 'fashion', 'electronics',
          'beauty', 'pharmacy', 'wholesale', 'general'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_status ON tenants(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_tenants_business_type ON tenants(business_type);
