# PosHive — Smart Business Onboarding

## What it does

After a **new** business registers, owners go through a PosHive onboarding wizard:

1. Welcome  
2. Select business type  
3. Confirm light setup  
4. Progress (live status)  
5. Complete → Open POS / Dashboard  

Existing tenants keep `onboarding_status = completed` (migration default) and are **not** forced through the wizard.

Skip leaves an empty catalog with `onboarding_status = skipped`.

No fake orders, sales, customers, revenue, or expenses are created.

## Migrate

From the backend package:

```bash
cd backend
npm run migrate
```

This applies `016_onboarding.sql`, which adds:

- `tenants.business_type`
- `tenants.onboarding_status` (`not_started` | `in_progress` | `completed` | `skipped` | `failed`)

New registrations set `onboarding_status = 'not_started'` and create a `MAIN` branch.

## API

All under `/api/v1/onboarding` (authenticate + requireTenant + requireTenantAccess):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/business-types` | List types + estimated catalog sizes |
| POST | `/select-business-type` | Body: `{ business_type }` |
| POST | `/setup` | Idempotent starter catalog seed |
| GET | `/status` | Status + progress counters |
| POST | `/skip` | Mark skipped, empty catalog |

`tenant_id` is never taken from the request body.

## Frontend

- Wizard: `/onboarding` (minimal `OnboardingLayout`)
- Register / login redirect when onboarding is required
- `OnboardingGate` blocks dashboard/POS until completed or skipped

## Images

Starter product images are **locally generated solid-color PNG placeholders** (not product photography). Replace them anytime in Products.
