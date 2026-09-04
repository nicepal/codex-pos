# PosHive Audit Fixes Changelog

**Date:** 2026-08-12  
**Source:** `docs/CODEXPOS-SYSTEM-AUDIT.md`

## P0 — Release 1 blockers

| ID | Fix |
|---|---|
| BUG-INV-001 | `branch-stock.service.js` `adjust()` decrements for `transfer` (and shared `_isDecrement` helper). |
| BUG-ORD-001 | `refundOrder` subtracts already-restocked return qty before restocking. |
| BUG-SHIFT-001 | Shifts SELECT uses `employees.name` as `employee_name`. |
| BUG-EMP-001 | PIN verify SELECT uses `employees.name`. |
| BUG-PAY-001 | Production defaults `PAYMENT_PROVIDER=stripe`; stub confirm gated by `ALLOW_PAYMENT_STUB`; Stripe confirm verifies session. |
| BUG-NGX-001 | Tenant vhost `*.poshive.store`. |

## P1 — High

| ID | Fix |
|---|---|
| BUG-POS-001 | Orders with `payments[]` / gift card set `payment_status=paid` and primary method (`split` when multi). |
| BUG-AUTH-001/002 | PIN login requires linked user; POS unlock uses `verify-pin` first (no fake refresh token). |
| BUG-DRW-001 | Drawer expected cash = float + cash tenders − cash refunds. |
| BUG-INV-002 | Adjustment honors `deduct` / negative qty; Inventory UI Add/Deduct. |
| BUG-SER-001 | Returned serials set to `in_stock` (resellable). |
| BUG-BND-001 | Bundle expansion allocates bundle `sale_price` across components. |
| BUG-DOM-001 | Custom domains resolve only when `verification_status=verified`. |
| BUG-SSO-001 | No account creation from client email; stub gated; existing users only. |
| BUG-ROLE-001 | `users.custom_role_id` + auth merges custom role permissions; assign/unassign routes. |
| FEAT-POS-GC | Gift card tender dialog + POS button (uses `/gift-cards/balance/:code`). |
| FEAT-POS-LOY | Loyalty tender dialog; backend redeems points on `payments[].method=loyalty`. |
| BRAND-EYZ | MFA `PosHive:`, API keys `cdx_` (legacy `eyz_` verify), offline DB name, logger, nginx domain. |
| Reports | Tax + payment-mix tabs wired to existing APIs. |

## Pass 2 — tests, honesty, P2 surgical fixes (2026-08-12)

| ID | Fix |
|---|---|
| TEST-E2E | Backend unit suite `tests/unit/financial-integrity.test.js` (payment status, refund restock math, transfer decrement). Playwright specs live-gated (`E2E_LIVE=1`); added `e2e/package.json` (`npm i` + `npm run test` / `test:live`). |
| BUG-POS-002 | POS tax estimate uses `tax_rules` when `tax_advanced` (shared `frontend/src/utils/posTax.js`); cart lines keep `category_id` / `tax_rule_id`; display rate aligned. |
| FEAT-PRINT | Print agent drain API: `POST /print/jobs/claim`, `…/complete`, `…/fail`; receipt response documents browser HTML vs queued ESC-POS. |
| FEAT-PAY-TERM | Card dialog honesty: record-only, no Stripe Terminal capture in this build. |
| FEAT-SH-SYNC | Shopify UI copy: catalog import only; button “Import updates” (not bidirectional orders/stock). |
| BUG-PWA-001 | Service worker no longer caches authenticated / tenant-scoped API GETs (`codexpos-pos-shell-v3`). |

## Deferred (intentional)

| Item | Reason |
|---|---|
| Docker `eyz-*` container/DB rename | Deploy continuity — existing compose volumes, scripts, and `DATABASE_URL` examples still use `eyz_user` / `eyz_pos`. Renaming risks broken local/prod deploys without a coordinated migration. |
| Full bidirectional Shopify (orders/inventory push) | Feature work, not a quick bugfix; import path remains. |
| Stripe Terminal / real card capture | Hardware + gateway integration (P2+). |
| Standalone print-agent binary / marketing site claims | Agent API is ready to consume; browser print documented in DEPLOYMENT. |
| Workers-in-compose verification | Verified: `eyz-worker` service in compose; documented in DEPLOYMENT Pass 3. |

## Pass 3 — P0/P1/P2 (2026-08-12)

### P0 — Release blockers

| ID | Fix |
|---|---|
| BUG-INV-003 | Product `create`/`update` upserts `branch_stock` via `branch-stock.service` (`_syncBranchStock`) instead of only writing `products.stock_quantity`. |
| BUG-INV-004 | Stock-take line uniqueness includes `variant_id` in `addStockTakeLine`. |
| BUG-AUTH-003 | `logout` async thunk calls `POST /auth/logout` with refresh token before clearing `localStorage`. |
| WORKER-VERIFY | Documented `eyz-worker` in compose + `DEPLOYMENT.md`; worker entry `backend/src/workers/index.js` → `startWorkers()`. |

### P1 — High priority

| ID | Fix |
|---|---|
| BUG-AUTH-004 | Password reset tokens stored as SHA-256 hash (`hashToken`); compared on `resetPassword`. |
| BUG-RPT-002 | `processScheduledReports()` added to worker hourly tick — emails due rows from `scheduled_reports`. No schedule UI exposed (API-only). |
| BUG-POS-003 | Offline sale shows printable cart summary in `SaleSuccessDialog` (`buildOfflineReceiptData` + browser print). |
| SUB-CANCEL | Already present: `POST /subscriptions/cancel`, `/resume`, `/downgrade` + Subscription page buttons — verified, no change. |
| TOKEN-LS | Documented `localStorage` limitation + logout revocation in `DEPLOYMENT.md`. |
| MARKETPLACE | Honest stub copy on Sales Channels page; stub vs WooCommerce import button labels. |
| PRINT-AGENT | `DEPLOYMENT.md` browser vs agent path; `HardwareDialog` already documents record-only terminal + agent queue. |

### P2 — Deferred (with reason)

| Item | Reason |
|---|---|
| Stripe Terminal capture | Record-only card flow already documented in `CardPaymentDialog`; no hardware integration. |
| Bidirectional Shopify | Import-only copy shipped Pass 2; push sync is feature work. |
| Abandoned cart | Worker already drains `cart_recovery_jobs` in `processBillingLifecycle` — no new UI. |
| i18n expansion | Non-trivial; existing `LocaleContext` unchanged. |
| KDS/restaurant, payroll, B2B, white-label, vendor portal, DB RLS | Out of scope for surgical audit pass. |
| `httpOnly` cookie auth | Invasive SPA change; logout revocation + docs as interim hardening. |
