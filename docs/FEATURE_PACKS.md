# Feature Packs

Optional tenant capabilities controlled by subscription plan defaults and Settings overrides.

## Pack keys

| Key | Label | Description |
|-----|-------|-------------|
| `pos_pro` | POS Pro | Variants at POS, returns, quick keys, manager overrides |
| `catalog_pro` | Catalog Pro | Bundles, serials, batches, CSV import |
| `tax_advanced` | Advanced Tax | Category tax rules, tax-exempt customers |
| `inventory_pro` | Inventory Pro | Transfers, stock take, PO receiving |
| `staff_pro` | Staff Pro | PIN login, drawer sessions, shifts, unified team |
| `crm_pro` | CRM Pro | Customer accounts, loyalty rules, tags |
| `omnichannel` | Omnichannel | Custom domains, click & collect, webhooks |
| `marketing_pro` | Marketing Pro | Campaigns, abandoned cart, SMS/email automation |
| `finance_pro` | Finance Pro | Ledger, journals, multi-currency, tax reports |
| `ai_pro` | AI Pro | Forecasting, content generation, AI assistant |
| `mfg_pro` | Manufacturing Pro | BOM and production orders |
| `enterprise` | Enterprise | SSO, SCIM, advanced permissions, franchise |
| `allow_negative_stock` | Allow Negative Stock | Sell when stock is zero |
| `open_price_items` | Open Price Items | Cashier can set price at POS |

## Plan defaults

- **Starter**: all packs off
- **Professional**: `pos_pro`, `catalog_pro`, `tax_advanced`, `inventory_pro`, `crm_pro`, `omnichannel`, `marketing_pro`
- **Enterprise**: all packs on

## Storage

- Plan features: `plans.features` JSON
- Tenant overrides: `settings` row with `key = 'features'`
- Resolved at request time via `resolveTenantFeatures()` in `backend/src/shared/features.js`

## API enforcement

Use `requireFeature('pack_key')` middleware on gated routes. Frontend uses `useTenantFeatures()` hook.

## Settings UI

Business → Settings → Feature Packs section toggles tenant overrides (subject to plan limits).
