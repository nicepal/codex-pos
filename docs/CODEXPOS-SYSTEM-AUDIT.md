# CodexPOS Complete System Audit

**Audit date:** 2026-08-12  
**Brand:** CodexPOS · **Domain:** codexpos.store  
**Scope:** Read-only static review of monorepo at `/Applications/MAMP/htdocs/POS`  
**Methodology:** Module inventory, frontend→API→service→DB flow tracing, schema cross-checks, threat review. No live penetration test; no product code changes.

> **Stack correction:** CodexPOS is **not Laravel**. It is **Node.js / Express + React / Vite / MUI + PostgreSQL + Redis / BullMQ**, with Socket.IO realtime and optional Stripe / OpenAI / Twilio. Package names and some Docker/nginx strings still say `eyz-pos` / `eyz.com`.

**Honesty scale:** **YES** = end-to-end usable · **PARTIAL** = real code with material gaps · **NO** = absent · **BROKEN** = present but fails / corrupts data · **STUB** = shell or fake completion.

---

## 1. Executive Summary

CodexPOS is a **broad multi-tenant SaaS POS + inventory + storefront** with genuine depth in tenancy, RBAC, feature packs, SMTP, Shopify catalog import, smart onboarding (migration 016), full-screen POS (split auto-balance, offline queue, receipt UI), and many newer modules (accounting, manufacturing, marketing, shifts, print, orgs).

It is **not yet safe as a production POS of record** and **not CodeCanyon-sale ready** without fixing inventory corruption, shift schema breakage, split-payment status bugs, payment-provider defaults, domain/nginx leftovers, and financial edge cases (refund after partial return).

| Score area | Verdict |
|---|---|
| Architecture / tenancy skeleton | Strong |
| Core POS cash sale | Usable (PARTIAL) |
| Inventory correctness | **Weak / BROKEN paths** |
| Staff shifts & drawer | **BROKEN / PARTIAL** |
| SaaS billing payments | PARTIAL (stub default) |
| Commercial polish (`eyz` → Codex) | Incomplete |
| Test coverage | Thin (few unit tests; Playwright config present) |

**Top blockers:** (1) stock transfer inflates inventory, (2) refund-after-return double-restock, (3) shifts/PIN SQL vs `employees.name`, (4) split orders leave `payment_status=pending`, (5) nginx tenant vhost still `*.eyz.com`, (6) `PAYMENT_PROVIDER` defaults to `stub`.

---

## 2. Architecture Overview

```
POS/
├── backend/          # Express API /api/v1, migrations 001–016, BullMQ workers
├── frontend/         # React SPA (admin + business + storefront + POS)
├── main-website/     # Isolated marketing site (Vite, port 5174) — not in compose
├── docker/           # nginx (eyz.conf), images
├── e2e/              # Playwright
└── docs/
```

| Layer | Tech | Evidence |
|---|---|---|
| API | Express 4, Joi (selective), Winston | `backend/src/app.js` |
| DB | PostgreSQL (`pg`), shared schema + `tenant_id` | `backend/src/database/migrations/` |
| Cache/queue | Redis + BullMQ | `backend/src/workers/queues.js` |
| Auth | JWT access + hashed refresh, RBAC | `middleware/auth.js`, `modules/auth/` |
| Frontend | React 18, Vite, MUI, Redux, TanStack Query | `frontend/src/` |
| Charts | Recharts (project rule) | dashboard / expenses |
| Marketing site | Separate app, no `frontend/` imports | `main-website/` |

**Tenancy:** Header `X-Tenant-Slug` / `X-Tenant-Domain` / host → `tenantResolver`. App-layer isolation; **no PostgreSQL RLS**.

**Feature packs:** Plan + overrides via `shared/features.js` + `requireFeature`.

---

## 3. Module Inventory

### Backend (`backend/src/modules/`)

| Module | Role | Status |
|---|---|---|
| auth | Register/login/refresh/reset/MFA/PIN | PARTIAL |
| onboarding | Business-type templates + starter catalog | **YES** |
| products (+ catalog-tracking, catalog-bundle) | Catalog, serials, batches, bundles | PARTIAL |
| categories, brands | CRUD | YES |
| inventory + branch-stock | Stock movements | PARTIAL / transfer **BROKEN** |
| transfers | Inter-branch | **BROKEN** |
| purchase-orders | PO + receive | YES (PARTIAL receive lots) |
| orders | POS + returns/refunds | PARTIAL |
| customers, loyalty | CRM + points | PARTIAL |
| gift-cards | Issue/redeem API | PARTIAL (weak POS UI) |
| expenses | Full CRUD/dashboard | YES |
| reports | SQL reports | PARTIAL (UI lag) |
| branches | Multi-branch | PARTIAL |
| shifts | Clock in/out, Z | **BROKEN** |
| drawer | Cash sessions | PARTIAL |
| employees, team | Staff | PARTIAL (PIN schema bugs) |
| settings, domains, tax-rules | Config | PARTIAL |
| payments + Stripe/stub | SaaS checkout | PARTIAL |
| storefront | Public shop/checkout | PARTIAL |
| integrations/shopify | Catalog import | PARTIAL (import-only) |
| marketplace | Channels | STUB (+ WooCommerce push) |
| webhooks | Deliver + retry | YES |
| api-keys, public-api | Developer API | YES |
| platform/email | SMTP, templates, logs | YES |
| ai | Reorder/forecast/copilot | PARTIAL |
| compliance | Fiscal PDF, GDPR export/erase | PARTIAL |
| accounting | Manual GL | PARTIAL (no auto-post) |
| manufacturing | BOM + production | YES |
| marketing | Campaigns, abandoned cart | PARTIAL |
| sso | OIDC-ready | **STUB** |
| orgs | Franchise rollup | PARTIAL |
| print | HTML/ESC-POS jobs | PARTIAL (no agent) |
| custom-roles | CRUD | **STUB** (not in auth) |
| tickets, cms, affiliates, billing, businesses, audit, activity, media, upload, reviews, coupons | Platform/ops | Mixed PARTIAL |

### Frontend pages (high level)

- **Auth:** `LoginPage`, `RegisterPage`, `ResetPassword`, forgot flow  
- **Onboarding:** `OnboardingWizard`, `OnboardingGate`  
- **POS:** `POS.jsx` + `layouts/POSLayout.jsx` + `components/pos/*`  
- **Business:** Products, Inventory, StockTake, Transfers, PO, Orders, Customers, GiftCards, Expenses, Reports, Branches, Shifts, Drawer, Settings, Shopify, Marketing, Accounting, Manufacturing, Developers, etc.  
- **Storefront:** Home, Shop, Product, Cart, Checkout, OrderConfirmation  
- **Admin:** Businesses, Plans, Billing, CMS, Email SMTP/templates/logs, Tickets, Affiliates, Audit  
- **Marketing site:** `main-website/src/pages/*` (Home, Pricing, Features, Blog, Shopify, Contact, …)

---

## 4. Feature Matrix

| Area | Status | Notes |
|---|---|---|
| Auth (email/password) | PARTIAL | Works; logout doesn’t revoke refresh; localStorage tokens |
| MFA | PARTIAL | Setup exists; label still `EYZPOS:` |
| PIN login / POS lock | BROKEN / PARTIAL | Unlinked employee JWT uses `employee.id` as `userId` → middleware 401; employees PIN verify selects missing columns |
| Smart onboarding + starter catalogs | **YES** | Migration `016_onboarding.sql` + 9 templates |
| Full-screen POS | **YES** | `POSLayout.jsx` |
| Empty-search product browse | **YES** | `products.repository.js` browse mode when `q` empty |
| Split pay live calc + auto-remaining | **YES** (UI) | `SplitPaymentDialog.jsx` `balancePeers` / `initialAmounts` + unit tests |
| Split pay order status | **BROKEN** | `payment_status` stays `pending` without top-level `payment_method` |
| Sale receipt redesign | **YES** (UI) | `SaleReceipt.jsx` + print CSS; print jobs may never drain |
| Offline / PWA | PARTIAL | IndexedDB queue; SW only in prod; API GET cache risk |
| Catalog variants | YES | |
| Serials / batches on sale | PARTIAL | Wired on sale; return serials not resellable; batch≠branch_stock |
| Bundles | PARTIAL | Expands; wrong pricing vs bundle price |
| Branch stock on sale/PO | YES | |
| Stock transfers | **BROKEN** | Out path increments |
| Manual adjustment | BROKEN-ish | Type `adjustment` always increments |
| Returns | PARTIAL | API+UI; no gateway refund by default |
| Full refund after partial return | **BROKEN** | Double restock risk |
| Gift card POS tender | NO (UI) | Backend supports `gift_card` method |
| Loyalty redeem at POS | NO | Earn async; redeem API not tender |
| Expenses | YES | |
| Reports | PARTIAL | Tax/payment-mix APIs unused in UI; schedule stub |
| Shifts / Z-report | **BROKEN** | `first_name`/`last_name` SQL |
| Cash drawer | PARTIAL | Expected cash = opening float only |
| Stripe billing | PARTIAL | Real when configured; default stub |
| Domains DNS TXT | YES verify | Host resolve ignores `verification_status` |
| Nginx subdomain storefront | **BROKEN** | `*.eyz.com` vs `codexpos.store` |
| Shopify import | YES | No order/inventory bidirectional sync |
| Storefront checkout coupons/GC | YES | Loyalty redeem NO |
| Public API + API keys | YES | Prefix `eyz_` |
| Email/SMTP | YES | |
| Webhook retries | YES | Hourly via billing lifecycle tick |
| Compliance/GDPR | PARTIAL | Staff endpoints; not full DSAR portal |
| Accounting | PARTIAL | Manual journals only |
| Manufacturing | YES | Uses branch_stock |
| Marketing automation | PARTIAL | SMS may simulate |
| SSO / custom roles | STUB | |
| Marketing site isolation | YES code / PARTIAL deploy | Not in docker-compose |
| Marketplace Amazon etc. | STUB | |

---

## 5. Critical Bugs

| ID | Severity | Module | Problem | Evidence |
|---|---|---|---|---|
| **BUG-INV-001** | **P0** | Transfers / branch_stock | Completing a transfer **increments source** and destination. `adjust()` only decrements for `stock_out`\|`sale`; type `transfer` hits increment branch. | `branch-stock.service.js` ~112–138, `transfer()` ~153–176 |
| **BUG-ORD-001** | **P0** | Orders / refunds | `refundOrder` restocks **full line qty** with no offset for prior `order_return_items` → **double inventory** after partial return + full refund. | `orders.service.js` `refundOrder` ~538–560 vs `returnOrder` ~563+ |
| **BUG-SHIFT-001** | **P0** | Shifts | List/current SELECT `e.first_name, e.last_name` but `employees` has `name` → runtime SQL failure. | `shifts.service.js` ~44–74; `002_business_operations.sql` employees |
| **BUG-EMP-001** | **P0** | Employees PIN | PIN verify SELECT `first_name, last_name` → fails. | `employees.routes.js` ~33–45 |
| **BUG-PAY-001** | **P0** | SaaS payments | `PAYMENT_PROVIDER` defaults to `'stub'`; authenticated `POST /payments/confirm` can complete checkout without Stripe money. | `config/index.js`; `payments.routes.js` `/confirm` |
| **BUG-NGX-001** | **P0** | Deploy / storefront | Tenant subdomain server_name is `~^(?<subdomain>.+)\.eyz\.com$` while apex is `codexpos.store`. | `docker/nginx/conf.d/eyz.conf` |

---

## 6. High Priority Bugs

| ID | Severity | Module | Problem | Evidence |
|---|---|---|---|---|
| **BUG-POS-001** | **P1** | POS / orders | Split (and payments-array) sales insert `payment_status='pending'` because paid flag requires `data.payment_method`. Reports/filters wrong. | `orders.service.js` ~325–326; `POS.jsx` split payload |
| **BUG-AUTH-001** | **P1** | Auth / POS PIN | Unlinked employee PIN JWT uses `userId: employee.id`; `authenticate` loads `users` → 401 after unlock. | `auth.service.js` `pinLogin`; `middleware/auth.js` |
| **BUG-AUTH-002** | **P1** | POS unlock | May store access token as refresh when `refreshToken` null → next refresh kicks to login. | `POS.jsx` unlock handler (per flow audit) |
| **BUG-DRW-001** | **P1** | Drawer | `expected_cash = opening_float` only; cash sales never added → useless variance. | `drawer.service.js` ~42–49 |
| **BUG-INV-002** | **P1** | Inventory | Manual “adjustment” always **adds** quantity (`else` increment). | `branch-stock.service.js` adjust else; `Inventory.jsx` |
| **BUG-SER-001** | **P1** | Serials | Returned serials → `returned`; sale requires `in_stock` → cannot resell. | `catalog-tracking.service.js` |
| **BUG-BND-001** | **P1** | Bundles | Sale expands to component prices, not bundle `sale_price`. | `catalog-bundle.service.js` / `orders.service.js` |
| **BUG-DOM-001** | **P1** | Domains | Host resolution does **not** require `verification_status='verified'`. | `middleware/tenant.js` `resolveTenantFromHost` |
| **BUG-SSO-001** | **P1** | SSO | Callback trusts client-supplied email (“OIDC stub”). | `sso.service.js` |
| **BUG-ROLE-001** | **P1** | Custom roles | CRUD exists; auth never merges `custom_roles` into JWT permissions. | `custom-roles.service.js` vs `middleware/auth.js` |

---

## 7. Medium/Low Bugs

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| BUG-POS-002 | P2 | Frontend tax from `preferences.tax_rate` vs backend tax_rules → split total mismatch risk | `POS.jsx`, tax service |
| BUG-POS-003 | P2 | Offline sale: no receipt dialog; only snackbar | `POS.jsx` offline path |
| BUG-PWA-001 | P2 | SW caches authenticated API GETs by URL | `frontend/public/sw.js` |
| BUG-INV-003 | P2 | Product create/update stock bypasses `branch_stock` | `products.service.js` |
| BUG-INV-004 | P2 | Stock-take upsert keys product only → variant overwrite | `inventory.service.js` |
| BUG-ORD-002 | P2 | Gateway refund optional/stub; no GC/loyalty reverse on return | `orders.service.js`, payments |
| BUG-RPT-001 | P2 | Tax & payment-mix report APIs unused by `Reports.jsx` | `reports.routes.js` / UI |
| BUG-RPT-002 | P2 | Report schedule inserts row; no worker | reports schedule |
| BUG-AUTH-003 | P2 | Client logout clears localStorage only — refresh not revoked | layouts logout |
| BUG-AUTH-004 | P3 | Password reset token stored plaintext | `auth.repository.js` |
| BUG-MFA-001 | P3 | MFA issuer string `EYZPOS:` | `auth.service.js` |
| BUG-KEY-001 | P3 | API keys prefixed `eyz_` | `api-keys.service.js` |
| BUG-POS-004 | P4 | `cartSlice.heldOrders` unused (hold is server-side) | `cartSlice.js` |
| BUG-OFF-001 | P4 | Offline orders dropped after 5 failed sync attempts | `useOfflineOrderSync` |
| BUG-AI-001 | P3 | Some AI routes not gated by `ai_pro` | `ai.routes.js` |

*(Older audit claimed ORDER BY SQLi in `BaseRepository`; current code uses `sanitizeSort` — treat as **mitigated**, re-verify allowlists periodically.)*

---

## 8. Broken User Flows

Traced against §63-style journeys (static evidence):

| Flow | Result |
|---|---|
| **F1** Register → onboarding type → setup → starter products → dashboard → POS → cash sale → receipt | **Works** (PARTIAL: branding leftovers; PIN lock optional) |
| **F2** Create product → add stock → sell → inventory ↓ → reports | **PARTIAL** — sale uses `branch_stock`; product stock field can desync; reports often use aggregates |
| **F3** PO → receive → stock ↑ | **Works**; supplier “balance” / AP not a full ledger |
| **F4** Sale → refund / return | **PARTIAL / BROKEN** if partial return then full refund |
| **F5** Split payment → order paid → payments rows → receipt → reports | **BROKEN status** — `order_payments` written but `payment_status` pending; receipt can still load |
| **F6** Cashier PIN → shift → sales → drawer close → reconcile | **BROKEN** — shifts SQL; drawer expected cash wrong; POS does not require open shift/drawer |
| **F7** Multi-branch isolation | **PARTIAL** — queries scoped by tenant; transfer corrupts stock; branch reports weak |
| Storefront subdomain on Docker nginx | **BROKEN** (`*.eyz.com`) |
| Unlinked employee PIN unlock → continue selling | **BROKEN** (401) |

---

## 9. UX/UI Improvements

1. POS gift-card / loyalty tender buttons (backend already partial).  
2. Gate POS on open shift + open drawer when `staff_pro`.  
3. Live drawer expected cash and variance explanation.  
4. Tax source single source of truth (settings vs tax_rules) shown in POS footer.  
5. Offline: pending-sale receipt / reprint after sync.  
6. Reports: expose tax liability + payment mix tabs already backed by API.  
7. Clear empty states when onboarding skipped with zero products.  
8. Manager override / PIN flows with clearer errors when employee unlinked.  
9. Reduce business chrome noise; POS already full-screen — keep register keyboard-first.  
10. Marketing site + app brand consistency (`CodexPOS` everywhere; purge `eyz`).  
11. Storefront mobile checkout progress / payment failure clarity.  
12. Inventory adjustment UI: signed qty or explicit increase/decrease.  

---

## 10. Missing Features

| Feature | Priority | Notes |
|---|---|---|
| Payment terminal / Stripe Terminal | High | Card dialog is confirm-only |
| Bidirectional Shopify (orders/inventory) | High | Import-only today |
| Real marketplace adapters | High | Stub |
| POS gift card + loyalty redeem | High | |
| Auto GL post from sales/COGS | Medium | Accounting pack incomplete otherwise |
| Print agent / cloud printer drain | Medium | Jobs stay queued |
| Verified-only domain routing + SSL automation | Medium | |
| Real OIDC token exchange | Medium | SSO stub |
| Custom roles enforcement + UI matrix | Medium | |
| Abandoned-cart polish / SMS reliability | Medium | Marketing PARTIAL |
| Franchise deep UX / org billing | Low–Med | Orgs PARTIAL |
| Kitchen/KDS, appointments | Future | |
| PayPal provider | Low | Env only |
| Full GDPR self-service portal | Medium | |

---

## 11. POS Improvements

**What is good now**

- Full-screen `POSLayout`; modular `components/pos/*`.  
- Empty search browse fixed in `products.repository.search`.  
- Split auto-balance: `balancePeers` keeps edited method, assigns remainder to peer (`SplitPaymentDialog.jsx`); covered by `frontend/tests/unit/split-payment-balance.test.js`.  
- Hold/resume (`pos_pro`), variants, coupons, manager discount PIN, offline queue + idempotent `client_order_id`.  
- Receipt UI redesigned (`SaleReceipt.jsx`).

**Must improve**

- Fix `payment_status` when `payments[]` present.  
- Wire gift card / loyalty tenders.  
- Align tax with backend.  
- Fix PIN session for employees without `user_id`.  
- Optional shift/drawer gates.  
- Card = real payment intent or clearly labeled “record only”.  
- Serial/batch UX on return.  
- Concurrent last-unit race: rely on `branch_stock` conditional UPDATE; verify allow-negative settings.

---

## 12. Payment Improvements

- Default `PAYMENT_PROVIDER=stripe` in production docs/env; refuse stub in `NODE_ENV=production`.  
- Require Stripe webhook signature path for subscription activation; harden `/payments/confirm`.  
- POS: distinguish “record card payment” vs captured payment.  
- Storefront: ensure paid status only after real capture (audit stub paths).  
- Refunds: gateway refund + inventory + gift/loyalty reverse in one transaction.  
- Split tenders: set `payment_method` e.g. `split` and `payment_status=paid`.  

---

## 13. Inventory Improvements

1. **Fix transfer out** — treat `transfer` like `stock_out` in `adjust()`, or call `saleDecrement`/`stock_out`.  
2. Adjustment types: increase vs decrease vs set.  
3. Unify product create stock → `branch_stock`.  
4. Batch qty sync with branch stock or document dual ledgers.  
5. Stock-take: include `variant_id` in uniqueness; wrap complete in one transaction.  
6. Low-stock reports from `branch_stock`.  
7. Serial lifecycle: `returned` → `in_stock` when restocking for resale.  

---

## 14. Sales Improvements

- Partial return + refund mutual exclusion / remaining qty.  
- Net revenue in reports (returns).  
- Tip, fulfillment, pickup already partially modeled — surface in UI consistently.  
- Idempotency already present for offline — extend to double-click pay button (disable + client_order_id always).  
- Hold resume: re-validate serials/batches.  

---

## 15. Customer Improvements

- Loyalty redeem as POS/storefront tender with order discount line.  
- Loyalty clawback on return.  
- Segments UI activation (marketing module has tables).  
- Duplicate email policy per tenant.  
- Storefront customer accounts depth / wishlist completeness.  

---

## 16. Supplier Improvements

- PO receive lot/expiry/serial.  
- Supplier AP / balance from PO receipts and expenses (today expenses optional `supplier_id` only).  
- Cancel / void PO; transfer cancel.  
- Vendor portal (future).  

---

## 17. Reporting Improvements

- Wire `/reports/tax` and `/reports/payment-mix` into `Reports.jsx`.  
- Branch-aware inventory valuation.  
- Exclude or net `refunded` properly (shifts Z currently includes refunded in sales — `shifts.service.js`).  
- Schedule worker or remove stub UI.  
- Z/X reports from drawer+shift as first-class POS close flow.  

---

## 18. Security Issues

| Issue | Severity | Notes |
|---|---|---|
| Tokens in localStorage | High | XSS → session theft |
| Refresh not revoked on UI logout | Medium | |
| Stub payment confirm in prod misconfig | Critical | |
| SSO email trust stub | Critical if marketed | |
| Unverified domain host map | High | |
| MFA issuer / branding leaks | Low | |
| PIN without Joi on route | Low | |
| Reset token plaintext | Medium | |
| Custom roles non-enforcement | High (false sense) | |
| SW caching private GETs | Medium | |
| No DB RLS | Medium (defense in depth) | |
| Impersonation (platform) | Review scope | Must stay admin-only |
| Public uploads | Review | Signed URLs preferred |

Open price still constrained by feature flag + `is_open_price` (`orders.service.js` ~143–148) — improved vs older “client price always wins” audits, but keep auditing storefront paths.

---

## 19. Performance Issues

- POS product search N+1 image subquery per row (acceptable for limit 48; watch).  
- Stock-take complete loops many single adjusts.  
- Report queries on large tenants may need indexes on `(tenant_id, created_at)` / payment tables — verify EXPLAIN in prod.  
- Redis tenant domain cache OK (300s) — invalidate on verify/delete.  
- BullMQ workers must run in production or email/Shopify/retries stall.  
- Marketing site not CDN-wired in compose.  

---

## 20. Database Issues

| Issue | Impact |
|---|---|
| Transfer ledger vs quantity mismatch | Inventory integrity |
| `products.stock_quantity` vs `branch_stock` dual source | Confusion / wrong low stock |
| Employees schema vs shift/PIN queries | Feature unusable |
| Split `payment_status` pending | Financial reporting |
| Refund ignores return history | Overstock |
| Soft delete / cascade on branch delete with open stock | Operational risk |
| Migrations 015–016 gap-closure + onboarding | Must run in order on deploy |

Migrations present: **001–016** (including `015_gap_closure_roadmap.sql`, `016_onboarding.sql`).

---

## 21. API Issues

- Inconsistent validation (auth has Joi; many modules thinner).  
- Public API solid for products/inventory/orders/customers; expand write scopes carefully.  
- Webhook retries piggyback billing lifecycle tick — OK but opaque.  
- Print API queues without consumer.  
- SSO/SCIM endpoints unsafe if exposed as “enterprise ready”.  
- API key prefix `eyz_` — rebrand.  

---

## 22. Multi-Branch Issues

- Branch CRUD + plan limits exist.  
- POS branch selector scopes search stock when `branch_id` set.  
- **Transfers corrupt stock** (blocker).  
- New branch does not seed stock.  
- Reports/inventory valuation often not branch-first.  
- Drawer open per branch; not enforced at POS.  

---

## 23. Business Category Issues

Onboarding business types (retail, grocery, restaurant, pharmacy, fashion, electronics, beauty, wholesale, general) seed **catalog templates** only — they do **not** auto-enable vertical packs (restaurant KDS, pharmacy compliance, etc.). Restaurant/pharmacy buyers may expect industry workflows that are still **NO** / future.

---

## 24. Onboarding Improvements

**Current: YES** for starter catalogs.

- Wizard + gate + progress API + idempotent SKU seed + `branch_stock`.  
- Docs: `docs/ONBOARDING.md`.  

Improvements: allow re-run after skip; optional feature-pack suggestions by type; real imagery; post-setup “first sale” checklist; ensure gate cannot be bypassed via deep links without status check (verify `OnboardingGate` on all business routes).

---

## 25. SaaS/Commercial Readiness

| Signal | Status |
|---|---|
| Multi-tenant + plans + feature packs | Strong |
| Stripe subscriptions | PARTIAL / dangerous default |
| Trial / lifecycle emails | Verify workers + templates (historically partial) |
| Super-admin tooling | Present |
| Support tickets | Improved vs ancient IDOR audit — still review |
| Domain product branding | Mixed (`eyz` leftovers) |
| main-website Codex redesign | Code YES; deploy PARTIAL |
| Ops: Redis/workers/nginx | Required; nginx subdomain bug |

---

## 26. CodeCanyon Readiness

**Not ready to sell as “complete production POS” without Release 1 fixes.**

Blockers for marketplace listing honesty:

1. Inventory transfer bug (data corruption).  
2. Shifts/PIN broken against schema.  
3. Payment stub default.  
4. Nginx `eyz.com` subdomain.  
5. Widespread `eyz-pos` / `eyz_` naming in packages, logger, API keys, offline DB, MFA label, DEPLOYMENT paths.  
6. SSO/custom roles marketed without enforcement = refund risk.  
7. Thin automated tests relative to financial surface.  
8. Documentation still mixes Gap Analysis claims that are partially stale (sale→branch_stock is now wired).  

---

## 27. Modern POS Feature Recommendations

- Hardware: scanners (works via search), drawers, printers (agent), payment terminals.  
- Offline-first with conflict UI (beyond silent drop).  
- Customer display / tips.  
- Age-restricted / controlled substance hooks for pharmacy type.  
- Table service / modifiers for restaurant type.  
- Advanced promotions (BOGO, happy hour).  
- Real-time multi-register stock locks.  
- AI: demand forecast already heuristic — meter `ai_pro` consistently.  

---

## 28. Recommended Roadmap

See **§60 Release Roadmap** below (Release 1–5).

---

## 29. Quick Wins

1. Fix `adjust()` to decrement on `transfer` (or use `stock_out`).  
2. Set `payment_status='paid'` / `payment_method='split'` when payments sum OK.  
3. Change shifts/employees SQL to `e.name`.  
4. Nginx: `*.codexpos.store`.  
5. Drawer expected cash = float + cash tenders − cash refunds.  
6. Production env: `PAYMENT_PROVIDER=stripe`.  
7. MFA label + API key prefix → CodexPOS.  
8. Expose tax + payment-mix report tabs.  
9. Disable `/payments/confirm` stub path in production.  
10. Document employee must link `user_id` for PIN until auth fixed.  

---

## 30. Critical Before Release

- [x] BUG-INV-001 transfer  
- [x] BUG-ORD-001 refund after return  
- [x] BUG-SHIFT-001 / BUG-EMP-001 schema  
- [x] BUG-POS-001 payment_status  
- [x] BUG-PAY-001 / stub  
- [x] BUG-NGX-001  
- [x] BUG-DRW-001  
- [x] BUG-DOM-001 verified-only routing  
- [x] Brand purge `eyz` → CodexPOS *(app-facing: MFA, API keys `cdx_`, offline DB, logger, nginx; docker DB creds/container names left for deploy continuity)*  
- [ ] Workers running in prod compose  
- [x] Smoke e2e: financial integrity unit tests + Playwright live-gated smoke (`E2E_LIVE=1`)  

---

## 31. Future Features

- Full restaurant KDS, appointments/services, payroll, deep franchise, PayPal, Amazon/TikTok live sync, white-label reseller console, mobile native apps, advanced forecasting, SCIM production-grade.

---

# 59. Master Priority Table

| ID | Type | Module | Problem/Feature | Priority | Complexity | Business Impact |
|---|---|---|---|---|---|---|
| BUG-INV-001 | Bug | Transfers | Transfer out increments stock | P0 | Low | Critical |
| BUG-ORD-001 | Bug | Orders | Refund after partial return double-restocks | P0 | Medium | Critical |
| BUG-SHIFT-001 | Bug | Shifts | SQL first/last name vs `name` | P0 | Low | High |
| BUG-EMP-001 | Bug | Employees | PIN verify column mismatch | P0 | Low | High |
| BUG-PAY-001 | Bug | Payments | Stub provider + confirm without money | P0 | Low | Critical |
| BUG-NGX-001 | Bug | Deploy | Subdomain `*.eyz.com` | P0 | Low | High |
| BUG-POS-001 | Bug | POS | Split leaves payment_status pending | P1 | Low | High |
| BUG-AUTH-001 | Bug | Auth | Unlinked PIN JWT 401 | P1 | Medium | High |
| BUG-DRW-001 | Bug | Drawer | Expected cash ignores sales | P1 | Medium | High |
| BUG-INV-002 | Bug | Inventory | Adjustment always increases | P1 | Low | High |
| BUG-SER-001 | Bug | Serials | Returned not resellable | P1 | Low | Medium |
| BUG-BND-001 | Bug | Bundles | Wrong sale price expansion | P1 | Medium | Medium |
| BUG-DOM-001 | Bug | Domains | Unverified host resolves | P1 | Low | High |
| BUG-SSO-001 | Bug | SSO | Trusts client email | P1 | High | High |
| BUG-ROLE-001 | Bug | RBAC | Custom roles not enforced | P1 | Medium | Medium |
| FEAT-POS-GC | Feature | POS | Gift card tender UI | P1 | Low | High |
| FEAT-POS-LOY | Feature | POS | Loyalty redeem tender | P1 | Medium | High |
| FEAT-PAY-TERM | Feature | Payments | Real card capture / Terminal | P2 | High | High |
| FEAT-SH-SYNC | Feature | Shopify | Orders/inventory sync | P2 | High | High |
| FEAT-PRINT | Feature | Print | Device agent / ESC-POS drain | P2 | Medium | Medium |
| FEAT-ACC-AUTO | Feature | Accounting | Auto-post sales journals | P2 | High | Medium |
| UX-SHIFT-GATE | UX | POS | Require open shift/drawer | P2 | Medium | Medium |
| BRAND-EYZ | Commercial | Platform | Purge eyz naming | P1 | Medium | High |
| TEST-E2E | Quality | QA | Financial smoke e2e suite | P1 | Medium | High |

---

# 60. Release Roadmap

## RELEASE 1 — MUST FIX (blockers / financial integrity)

Transfer decrement, refund vs return, shifts/PIN SQL, split `payment_status`, payment stub hardening, nginx `codexpos.store`, drawer expected cash, inventory adjustment sign, brand-critical env defaults.

## RELEASE 2 — COMMERCIAL READY

Gift card + loyalty POS tenders, verified-only domains, serial resell path, bundle pricing, tax UI alignment, report tax/payment-mix UI, eyz→Codex purge, workers+docs for buyers, honest feature flags (hide SSO/custom-roles or finish them).

## RELEASE 3 — UX/UI POLISH

Shift/drawer POS gates, offline receipt/reprint, clearer PIN errors, inventory adjust UX, onboarding checklist, storefront polish, marketing site in deploy story.

## RELEASE 4 — ADVANCED POS

Terminals, print agent, hold/resume hardening, concurrent stock, Z-report close wizard, returns wizard with gateway refund.

## RELEASE 5 — COMPETITIVE FEATURES

Shopify bidirectional, real marketplaces, accounting auto-post, real OIDC, franchise UX, vertical packs (restaurant/pharmacy), AI metering.

---

# 61. TOP 20 THINGS I SHOULD FIX/BUILD FIRST

1. Fix branch transfer stock corruption (BUG-INV-001)  
2. Fix refund-after-return double restock (BUG-ORD-001)  
3. Harden payments: no stub activation in production (BUG-PAY-001)  
4. Fix split payment `payment_status` (BUG-POS-001)  
5. Fix shifts + employee PIN SQL (BUG-SHIFT-001 / BUG-EMP-001)  
6. Fix nginx tenant subdomain to `codexpos.store` (BUG-NGX-001)  
7. Fix drawer expected cash from cash tenders (BUG-DRW-001)  
8. Fix inventory adjustment decrement path (BUG-INV-002)  
9. Fix unlinked PIN auth session (BUG-AUTH-001 / 002)  
10. Verified-only custom domain resolution (BUG-DOM-001)  
11. Gift card tender on POS  
12. Loyalty redeem on POS  
13. Purge `eyz` branding (packages, keys, MFA, offline DB, docs paths)  
14. Serial return → resellable stock  
15. Bundle pricing correctness  
16. Wire tax + payment-mix reports in UI  
17. Disable or finish SSO stub before selling “enterprise”  
18. Enforce or hide custom roles  
19. End-to-end smoke tests for F1–F5  
20. Print job consumer or remove “print” claim from marketing  

---

# 65. Final Decision

### 1. Is CodexPOS currently safe to use as a production POS?
**No** — not as system of record for multi-branch inventory or shift cash control. Single-branch cash/card-record POS may work for demos after avoiding transfers/refunds/shifts bugs.

### 2. Is CodexPOS ready for commercial sale?
**No** — CodeCanyon / paid SaaS sale would be misleading until Release 1 (+ branding/payment defaults). Core story is strong; integrity and honesty gaps remain.

### 3. What are the 5 biggest weaknesses?
1. Inventory integrity (transfer / adjustment / dual stock fields)  
2. Staff shift & drawer reconciliation broken or meaningless  
3. Financial status bugs (split pending; refund restock)  
4. Payment/SaaS misconfiguration risk (stub)  
5. Enterprise claims ahead of implementation (SSO, custom roles)

### 4. What are the 5 biggest strengths?
1. Real multi-tenant SaaS architecture + feature packs  
2. Smart onboarding with starter catalogs (016)  
3. Full-screen modern POS with split auto-balance, offline queue, receipt UI  
4. Omnichannel foundations (storefront, Shopify import, domains DNS verify, webhooks, public API)  
5. Platform ops (SMTP queue, admin, packs, manufacturing/accounting seeds of depth)

### 5. What features are absolutely required before release?
Transfer fix, refund/return integrity, shifts/PIN fix, split payment status, production Stripe enforcement, nginx domain fix, drawer math, minimum e2e smoke, branding purge.

### 6. What bugs could cause financial/data problems?
BUG-INV-001, BUG-ORD-001, BUG-POS-001, BUG-PAY-001, BUG-DRW-001, BUG-BND-001, tax UI/backend mismatch, silent offline drop after retries.

### 7. What UX problems could slow cashiers down?
Broken PIN unlock, no gift/loyalty tender, tax mismatch errors on split, shift screens erroring, empty product grid if search/browse regression, offline without receipt, no forced drawer/shift discipline.

### 8. What features would make CodexPOS more competitive?
Terminals + printers, bidirectional Shopify, real promotions, loyalty at register, vertical modes, auto accounting, true offline-first conflict UI.

### 9. What should NOT be built yet?
More marketplace stubs, deeper franchise UX, payroll, KDS, more AI surfaces — **until** inventory/payments/shifts integrity is solid.

### 10. If you were the product owner, what would you work on for the next 30 days?
**Week 1:** P0 inventory + orders + shifts/PIN + nginx + payment defaults.  
**Week 2:** Split status, drawer math, adjustment sign, domain verified-only, brand purge.  
**Week 3:** POS gift/loyalty tenders, serial/bundle fixes, report UI wiring.  
**Week 4:** e2e smoke, hide/finish SSO & custom roles, deploy marketing site story, CodeCanyon honesty pass.

---

## Appendix A — Critical flow traces (evidence)

### A1. Onboarding setup
`OnboardingWizard.jsx` → `POST /onboarding/select-business-type` → `POST /onboarding/setup` → `onboarding.service.js` → `categories` / `products` / `product_variants` / `product_images` / `branch_stock` → `tenants.onboarding_status='completed'`.

### A2. Cash POS sale
`POS.jsx` → `POST /orders` (`business.pos`) → `orders.service.createPOSOrder` → `orders` + `order_items` + `order_payments` + `branchStockService.saleDecrement`.

### A3. Split payment
`SplitPaymentDialog.jsx` (`balancePeers`) → `POST /orders` with `payments[]` → rows in `order_payments` → **bug:** order `payment_status` pending.

### A4. Transfer
`Transfers.jsx` → complete → `transfers.service` → `branchStockService.transfer` → **bug:** source incremented.

### A5. Domain verify
`DomainsSection.jsx` → domains service TXT `codexpos-verify=` → OK; host resolve still accepts unverified rows.

---

## Appendix B — Recent work verification

| Claim | Current state |
|---|---|
| Smart onboarding + starter catalogs | **YES** — 016 + templates + wizard |
| Full-screen POS | **YES** — `POSLayout` |
| Empty search browse | **YES** — browse mode in `products.repository.search` |
| Split live calc then auto-remaining | **YES** in UI (`balancePeers`); backend status **BROKEN** |
| Sale receipt redesign | **YES** UI (`SaleReceipt.jsx`) |
| Marketing site Codex redesign | **YES** isolated `main-website/`; deploy wiring **PARTIAL** |

---

*End of audit. No product code was modified; only this document was created.*
