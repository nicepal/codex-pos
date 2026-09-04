# PosHive — Remaining Audit Tasks
Date: 2026-08-12

## Executive Summary (counts)

Reconciliation of `CODEXPOS-SYSTEM-AUDIT.md`, `CODEXPOS-AUDIT-FIXES.md` (Pass 1–3), `GAP_ANALYSIS.md`, `CHATGPT_PROJECT_BRIEF.md`, `audit/TEST_CASES.md`, and spot-checks of current code.

| Category | Count |
|----------|-------|
| **P0 — Critical remaining** | **0** (all Release 1 code blockers from Pass 1–3 verified fixed; no regressions found) |
| **P1 — High priority** | **4 partial / deferred** (see table) |
| **P2 — Future** | **22** |
| **Already completed** | **38** (Pass 1–3 fixes verified in code) |
| **Deferred (intentional)** | **8** |
| **Regressions** | **0** |
| **Needs manual verification** | **9** |

**POS `/pos` snapshot:** Full-screen POS with register gate (shift + drawer when `staff_pro`), cash/card/split/gift-card/loyalty tenders, tips, barcode scan with miss feedback, variants, manager override/open price, offline queue + printable offline receipt + sync handoff to server receipt, returns dialog, browser print + print-job queue API, record-only card terminal. **Missing:** real terminal capture, KDS/restaurant, customer display, loyalty redeem on storefront.

---

# P0 — Critical Remaining Work

No open P0 code blockers remain from the original audit. Pass 1–3 fixes were spot-checked in source (transfer decrement, refund restock math, shifts/PIN SQL, split `payment_status`, payment stub gating, nginx `*.poshive.store`, drawer expected cash, branch_stock sync, offline receipt, logout revocation, etc.). See **Already Completed** and **Regressions**.

| ID | Feature | Status | Evidence | Current implementation | Missing piece | Files | API | Database | Recommended fix |
|----|---------|--------|----------|------------------------|---------------|-------|-----|----------|-----------------|
| — | — | — | — | — | — | — | — | — | — |

---

# P1 — High Priority

| ID | Feature | Status | Evidence | Current implementation | Missing piece | Files | API | Database | Recommended fix |
|----|---------|--------|----------|------------------------|---------------|-------|-----|----------|-----------------|
| BUG-ORD-002 | Return/refund financial reversal | COMPLETED | `returnOrder` + GC credit + loyalty clawback/restore | — | `orders.service.js`, `gift-cards.service.js`, `loyalty.service.js` | `POST /orders/:id/return` | `gift_card_transactions`, `loyalty_transactions` | — |
| BUG-OFF-001 | Offline sync permanent failure | COMPLETED | Retry/edit/dismiss UX + `flushSingle` | — | `OfflineQueueDialog.jsx`, `useOfflineOrderSync.js` | `POST /orders` | IndexedDB | — |
| BUG-RACE-001 | Concurrent oversell | COMPLETED | `lockQuantity` + FOR UPDATE in sale path | — | `branch-stock.service.js` | `POST /orders` | `branch_stock` | — |
| SEC-TOKEN-LS | JWT in localStorage | MISSING (deferred hardening) | `authSlice.js` stores tokens in `localStorage`; documented in `DEPLOYMENT.md` | Access + refresh in `localStorage`; logout revokes refresh server-side | `httpOnly` cookie session; XSS → token theft risk | `frontend/src/features/auth/authSlice.js`, `frontend/src/services/api.js` | `POST /auth/logout` | `refresh_tokens` | Plan invasive SPA auth migration to `httpOnly` cookies + CSRF |
| FEAT-PAY-TERM | Payment terminal / Stripe Terminal | MISSING | `CardPaymentDialog.jsx` record-only copy; Pass 2 honesty fix | Card sales recorded as paid without capture | Hardware reader integration, PaymentIntent/Terminal capture | `frontend/src/components/pos/CardPaymentDialog.jsx`, `payments/` | `POST /orders` (method `card`) | `orders.payment_intent_id` | Integrate Stripe Terminal or document-only for v1; never claim capture without gateway |
| FEAT-SH-SYNC | Bidirectional Shopify | DEFERRED / MISSING | `shopify.worker.js` import-only; UI copy Pass 2 | Catalog import via BullMQ worker | Order push, inventory sync outbound | `backend/src/modules/integrations/shopify/*`, `Shopify.jsx` | `POST /integrations/shopify/import` | `shopify_import_jobs` | Phase feature: outbound inventory + order sync with webhook reconciliation |
| FEAT-PRINT-AGENT | Standalone print agent | PARTIALLY IMPLEMENTED | `print.service.js` claim/complete/fail; `HardwareDialog.jsx` | Jobs queued; browser HTML print; API drain ready | No shipped agent binary/service for ESC-POS printers | `backend/src/modules/print/*`, `HardwareDialog.jsx`, `DEPLOYMENT.md` | `POST /print/jobs/claim`, `/complete`, `/fail` | `print_jobs` | Ship small Node/Electron agent or document buyer DIY agent using claim API |
| FEAT-ACC-AUTO | Auto GL from sales/COGS | MISSING | `accounting.service.js` manual journals only | Manual chart + journal CRUD, P&L/BS reports | No auto-post from orders, PO, expenses | `backend/src/modules/accounting/*`, `Accounting.jsx` | `POST /accounting/journals` | `journal_entries`, `journal_lines`, `ledger_accounts` | Post sales/COGS/cash journals on order paid/refund hooks |
| SSO-OIDC-FULL | Production OIDC SSO | PARTIALLY IMPLEMENTED | `sso.service.js` — JWKS verify not complete; `ALLOW_SSO_STUB` for demos | Config CRUD, callback matches existing users only | Full token exchange + JWKS signature verification | `backend/src/modules/sso/*` | `POST /sso/callback` | `sso_configs` | Complete OIDC code→token flow and JWKS validation; hide UI until done |
| MARKETPLACE-STUBS | Real marketplace adapters | STUB | `marketplace.service.js` — WooCommerce live; others stub message | WooCommerce REST import | Amazon/eBay/TikTok/Meta/Google live sync | `marketplace.service.js`, `Marketplace.jsx` | `POST /marketplace/:channel/sync` | `marketplace_integrations` | One channel end-to-end before marketing; honest stub labels already shipped |
| BUG-RPT-SCHED-UI | Scheduled report UI | PARTIALLY IMPLEMENTED | `processScheduledReports()` in worker; `reports.service` insert | Worker emails due `scheduled_reports` hourly | No business UI to create/manage schedules | `backend/src/workers/queues.js`, `reports.service.js`, `Reports.jsx` | `POST /reports/schedule` (API) | `scheduled_reports` | Add Reports → Schedule tab or remove API until UI exists |
| STOREFRONT-LOY | Storefront loyalty redeem | MISSING | `Checkout.jsx` coupons + gift cards; earn on checkout | Loyalty earn async after paid order | Redeem points as checkout tender | `storefront.checkout.service.js`, `Checkout.jsx`, `loyalty.service.js` | `POST /storefront/checkout` | `loyalty_transactions` | Mirror POS loyalty tender: points→discount line at checkout |
| SEC-UPLOAD | Upload access control | NEEDS VERIFICATION | `media.routes.js` mixed public/signed; audit flagged cross-tenant reads | Signed URLs for private media; some `public` cache headers | Confirm tenant isolation on `/uploads` paths | `backend/src/modules/media/*`, `upload.service.js` | `GET /uploads/*` | `media` | Audit static handler; enforce signed URLs for non-catalog assets |
| BUG-AI-001 | AI feature gating | PARTIALLY IMPLEMENTED | `ai.routes.js` — forecast/chat gated; reorder/insights open | `requireFeature('ai_pro')` on advanced routes | `/ai/reorder-suggestions`, `/ai/insights` lack `ai_pro` gate | `backend/src/modules/ai/ai.routes.js` | `GET /ai/reorder-suggestions`, `POST /ai/insights` | — | Add `requireFeature('ai_pro')` or move to base plan explicitly |
| BRAND-EYZ-DOCKER | Docker/DB `eyz_*` naming | DEFERRED | `docker-compose.yml` `eyz-worker`; `config` defaults `eyz_pos` | App-facing PosHive branding done | Container names, DB creds, S3 bucket `eyz-pos` | `docker-compose.yml`, `backend/src/config/index.js` | — | — | Coordinated migration with volume/URL cutover (see Deferred) |

---

# P2 — Future

| ID | Feature | Status | Evidence | Current implementation | Missing piece | Files | API | Database | Recommended fix |
|----|---------|--------|----------|------------------------|---------------|-------|-----|----------|-----------------|
| FEAT-I18N | Full i18n | PARTIALLY IMPLEMENTED | `LocaleContext.jsx`, minimal `dictionaries.js` | EN/ES/FR/AR stub keys for nav | Most UI strings hardcoded English | `frontend/src/contexts/LocaleContext.jsx`, `i18n/dictionaries.js` | `PUT /settings/locale` | `settings` | Expand dictionaries or adopt i18n library; translate business + POS |
| FEAT-KDS | Kitchen / restaurant KDS | MISSING | Gap analysis; onboarding seeds restaurant template only | No `kds_tickets`, modifiers, table service | Full vertical pack | — | — | — | New `restaurant_pro` pack: KDS feed, modifiers, table maps |
| FEAT-CUST-DISP | Customer-facing display | MISSING | Audit §27 recommendations | — | Second screen / pole display | — | — | — | WebSocket or lightweight display URL per register |
| FEAT-PAYPAL | PayPal provider | MISSING | Env mentions only | Stripe + stub | PayPal checkout adapter | `payments/providers/` | `POST /payments/*` | — | Add provider module + storefront/POS option |
| FEAT-PAYROLL | Payroll | MISSING | Gap analysis Phase 3 | — | Runs, payslips, approvals | — | — | `payroll_runs` (planned) | Defer until finance pack mature |
| FEAT-B2B | B2B corporate accounts | MISSING | Gap analysis | — | Net terms, quotes, approvals | — | — | — | `b2b_pro` pack |
| FEAT-WHITELABEL | White-label reseller | MISSING | Theme partial | Per-tenant branding | Reseller console, billing split | — | — | — | Enterprise roadmap |
| FEAT-VENDOR | Vendor portal | MISSING | Suppliers CRUD only | — | ASN, PO visibility for vendors | — | — | — | Optional `inventory_pro` add-on |
| SEC-RLS | PostgreSQL RLS | MISSING | App-layer `tenant_id` only | Middleware + query scoping | Defense-in-depth DB policies | — | — | All tenant tables | Add RLS policies per table if targeting enterprise |
| FEAT-MAIN-WEB | Marketing site deploy | PARTIALLY IMPLEMENTED | `main-website/` isolated Vite app | Codex redesign in repo | Not in `docker-compose.yml` | `main-website/` | — | — | Add compose service or CDN deploy story |
| FEAT-FEFO | Expiry / FEFO alerts | PARTIALLY IMPLEMENTED | Batch CRUD + consume on sale | `catalog-tracking.service.js` | No FEFO picking or alert reports | `catalog-tracking.service.js` | — | `product_batches` | Low-stock style alerts for expiry windows |
| FEAT-MCURRENCY | Multi-currency / FX | PARTIALLY IMPLEMENTED | `accounting` exchange rate upsert | Single currency per tenant typical | POS/storefront FX conversion | `accounting.service.js` | `POST /accounting/exchange-rates` | `exchange_rates` | `finance_pro` pack |
| FEAT-FRANCHISE | Franchise HQ UX | PARTIALLY IMPLEMENTED | `orgs` rollup API | `orgs.service.js` rollup | Deep HQ dashboard, royalties | `orgs/*`, `Orgs` (if any) | `GET /orgs/:id/rollup` | `orgs`, `org_tenants` | Phase 3 enterprise |
| FEAT-PUSH | Web push / FCM | MISSING | — | — | Push subscriptions + send | — | — | — | `marketing_pro` |
| FEAT-AI-REC | Product recommendations | PARTIALLY IMPLEMENTED | Random related products storefront | — | Co-purchase model | `storefront.service.js` | — | — | Use `order_items` co-occurrence |
| FEAT-AFF-COMM | Affiliate commissions | PARTIALLY IMPLEMENTED | `attributeOrder` on checkout | Order tagged with `affiliate_id` | Auto commission rows on paid orders | `marketing.service.js` | `POST /marketing/affiliates/track` | `affiliate_commissions` | Create commission on order paid |
| FEAT-GL-EXPORT | QuickBooks / Xero export | MISSING | Manual GL only | CSV reports partial | Accounting export connectors | `accounting/*` | — | `journal_entries` | Standard export formats |
| FEAT-TAX-FILING | Tax filing / nexus | PARTIALLY IMPLEMENTED | Tax rules + `/reports/tax` UI | Reports tab wired Pass 1 | Nexus, filing forms | `reports.service.js`, `Reports.jsx` | `GET /reports/tax` | `tax_rules`, `orders` | Partner integration or export |
| FEAT-LABEL | Barcode label print | PARTIALLY IMPLEMENTED | Barcode on products; print jobs | Browser receipt print | Label templates, shelf labels | `print.service.js`, POS | `POST /print/receipt` | `print_jobs` | Label layout + agent |
| FEAT-PROMO | Advanced promotions | PARTIALLY IMPLEMENTED | Coupons at POS/checkout | Basic coupon codes | BOGO, happy hour, stack rules | `coupons/*` | — | `coupons` | Promotion engine |
| FEAT-GDPR-PORTAL | GDPR self-service | PARTIALLY IMPLEMENTED | `compliance` staff endpoints | Export/erase APIs | Customer self-service portal | `compliance/*` | — | — | Storefront account privacy center |
| FEAT-SCIM-PROD | SCIM production-grade | STUB | `sso.routes.js` SCIM stubs | Basic SCIM user CRUD in stub | Hardening, auth, rate limits | `sso/*` | `/scim/v2/*` | `users` | Enterprise only |
| BUG-POS-004 | Dead `heldOrders` in cart slice | MISSING (cleanup) | `cartSlice.js` | Hold is server-side | Unused Redux field | `frontend/src/features/pos/cartSlice.js` | `GET /orders/held` | — | Remove or wire to UI |
| UX-Z-CLOSE | Z-report close wizard | PARTIALLY IMPLEMENTED | `Shifts.jsx` Z-report API; `CloseRegisterDialog` | Z-report fetch; drawer close | Unified POS close flow (shift + drawer + Z) | `Shifts.jsx`, `CloseRegisterDialog.jsx` | `GET /shifts/:id/z-report` | `shifts`, `cash_drawer_sessions` | Single “close register” wizard |

---

# Already Completed

Pass 1–3 fixes from `CODEXPOS-AUDIT-FIXES.md` verified in code (not listed as open unless regressed).

| ID | Summary |
|----|---------|
| BUG-INV-001 | Transfer outbound decrements via `_isDecrement` |
| BUG-ORD-001 | Refund restock offsets prior return qty (`restockQtyAfterReturns`) |
| BUG-SHIFT-001 | Shifts use `employees.name` |
| BUG-EMP-001 | PIN verify uses `employees.name` |
| BUG-PAY-001 | Production defaults `PAYMENT_PROVIDER=stripe`; stub confirm gated |
| BUG-NGX-001 | Nginx tenant vhost `*.poshive.store` |
| BUG-POS-001 | `derivePaymentFields` sets `payment_status=paid` for split/gift card |
| BUG-AUTH-001/002 | PIN requires linked user; POS unlock via verify-pin |
| BUG-DRW-001 | Drawer expected cash = float + cash sales − refunds + movements |
| BUG-INV-002 | Adjustment deduct/negative qty; Inventory Add/Deduct UI |
| BUG-SER-001 | Returned serials → `in_stock` |
| BUG-BND-001 | Bundle sale_price allocation across components |
| BUG-DOM-001 | Custom domains require `verification_status=verified` |
| BUG-SSO-001 | No account creation from client email; stub gated |
| BUG-ROLE-001 | `custom_role_id` merged in auth middleware |
| FEAT-POS-GC | Gift card tender dialog + button |
| FEAT-POS-LOY | Loyalty tender dialog + backend redeem |
| BRAND-EYZ | MFA `PosHive:`, API keys `cdx_`, offline DB, logger, nginx |
| Reports | Tax + payment-mix tabs in `Reports.jsx` |
| TEST-E2E | `financial-integrity.test.js`; Playwright live-gated |
| BUG-POS-002 | POS tax via `posTax.js` + `tax_rules` |
| FEAT-PRINT | Print job claim/complete/fail API |
| FEAT-PAY-TERM (honesty) | Card dialog documents record-only |
| FEAT-SH-SYNC (honesty) | Shopify import-only UI copy |
| BUG-PWA-001 | SW shell cache only (`codexpos-pos-shell-v3`) |
| BUG-INV-003 | Product create/update syncs `branch_stock` |
| BUG-INV-004 | Stock-take line uniqueness includes `variant_id` |
| BUG-AUTH-003 | Logout calls `POST /auth/logout` before clearing storage |
| WORKER-VERIFY | `eyz-worker` in compose; documented in `DEPLOYMENT.md` |
| BUG-AUTH-004 | Password reset tokens SHA-256 hashed |
| BUG-RPT-002 | Scheduled reports processed in worker hourly tick |
| BUG-POS-003 | Offline printable receipt in `SaleSuccessDialog` |
| SUB-CANCEL | Cancel/resume/downgrade routes + Subscription page |
| TOKEN-LS (docs) | localStorage limitation documented |
| MARKETPLACE (honesty) | Stub copy on Sales Channels page |
| PRINT-AGENT (docs) | Browser vs agent path in DEPLOYMENT + HardwareDialog |
| UX-SHIFT-GATE | `RegisterGate` when `staff_pro` + `require_register_session` |
| POS extras | Variants (`VariantPickerDialog`), barcode miss feedback, tips, manager override, serial/batch on sale, bundle UI on ProductDetail, ReturnRefundDialog, offline sync → server receipt handoff |

---

# Deferred

| Item | Reason |
|------|--------|
| Docker `eyz-*` container/DB rename | Deploy continuity — volumes, `DATABASE_URL`, scripts |
| Full bidirectional Shopify | Feature work; import path sufficient for now |
| Stripe Terminal / real card capture | Hardware + gateway; record-only documented |
| Standalone print-agent binary | Agent API ready; browser print documented |
| Workers-in-compose verification | Service present; runtime ops responsibility |
| `httpOnly` cookie auth | Invasive SPA change; logout revocation interim |
| KDS / restaurant / payroll / B2B / white-label / vendor portal / DB RLS | Out of scope surgical pass |
| Abandoned cart UI polish | Worker drains `cart_recovery_jobs`; Marketing page lists carts |

---

# Regressions

Spot-checks of Pass 1–3 fixes found **no regressions**. Key checks:

- `branch-stock.service.js`: `_isDecrement('transfer')` → decrement
- `orders.helpers.js`: `derivePaymentFields` for split payments
- `shifts.service.js` / `employees.routes.js`: `e.name`
- `docker/nginx/conf.d/eyz.conf`: `*.poshive.store`
- `drawer.service.js`: `computeExpected` includes cash tenders
- `frontend/public/sw.js`: `codexpos-pos-shell-v3`
- `POS.jsx`: `buildOfflineReceiptData`, `RegisterGate`, gift/loyalty dialogs
- `auth.service.js`: MFA label `PosHive:`, `hashToken` on reset

---

# Needs Manual Verification

| ID | Area | What to verify |
|----|------|----------------|
| VERIFY-E2E | QA | `E2E_LIVE=1` Playwright financial smoke against staging API |
| VERIFY-WORKER | Ops | `eyz-worker` running in prod; trial emails, cart recovery, scheduled reports, Shopify jobs execute |
| VERIFY-STRIPE | Billing | Subscription checkout + webhook activates plan; stub confirm disabled in production |
| VERIFY-WOO | Integrations | WooCommerce import on real store with consumer key/secret |
| VERIFY-PRINT | Hardware | External agent claims `POST /print/jobs/claim` and completes ESC-POS job |
| VERIFY-SSO | Enterprise | OIDC with real IdP; confirm stub disabled in production |
| VERIFY-RACE | POS | Two registers selling last unit simultaneously — expect one failure |
| VERIFY-SUBDOMAIN | Deploy | `{slug}.poshive.store` storefront on Docker nginx |
| VERIFY-UPLOAD | Security | Cross-tenant media URL access attempts |

---

# Recommended Implementation Order

1. **Financial integrity (P1)** — BUG-ORD-002 (GC/loyalty reversal), BUG-RACE-001 (stock locking), BUG-OFF-001 (failed offline queue UX).
2. **Honest payments (P1)** — Keep record-only card documented; plan FEAT-PAY-TERM or partner terminal SDK.
3. **Operations (P1)** — VERIFY-WORKER + VERIFY-STRIPE in staging/prod; BUG-RPT-SCHED-UI or hide schedule API.
4. **Commerce depth (P1)** — STOREFRONT-LOY; one real MARKETPLACE-STUBS channel (or keep honest stubs).
5. **Enterprise hardening (P1)** — SSO-OIDC-FULL, SEC-TOKEN-LS roadmap, SEC-UPLOAD audit.
6. **Finance pack (P2)** — FEAT-ACC-AUTO, then FEAT-GL-EXPORT / FEAT-TAX-FILING.
7. **Vertical / competitive (P2)** — FEAT-PRINT-AGENT binary, FEAT-KDS, FEAT-CUST-DISP, FEAT-I18N.
8. **Long horizon (P2)** — Franchise, B2B, payroll, white-label, RLS, SCIM prod.

---

*Read-only reconciliation. No application code modified.*
