# CodexPOS Final POS Gap Audit
Date: 2026-08-12

## Executive Summary (counts table)

Read-only reconciliation of audit docs (`CODEXPOS-SYSTEM-AUDIT.md`, `CODEXPOS-AUDIT-FIXES.md` Pass 1–3, `CODEXPOS-POS-IMPLEMENTATION-LOG.md`, `CODEXPOS-REMAINING-AUDIT-TASKS.md`) against **current source** as of 2026-08-12. POS `/pos` was traced end-to-end: register gate → sale → tender → receipt → close → return → offline sync.

| Category | Count |
|----------|-------|
| **P0 — Critical remaining** | **0** |
| **P1 — High priority remaining** | **5** |
| **P2 — Future / polish** | **14** |
| **COMPLETED / VERIFIED** | **53** |
| **DEFERRED (intentional)** | **7** |
| **Regressions** | **0** |
| **Needs manual verification** | **8** |

**POS snapshot:** Full-screen register with shift+drawer gate (`staff_pro`) enforced on frontend and **`POST /orders` API**, cash/card/split/gift-card/loyalty tenders, tips, barcode scan with hit/miss feedback + search action, manager void/price override, cash in/out + expected-cash math, unified Z-close wizard, receipt history/reprint, returns with GC/loyalty reversal + manager auth above threshold, offline queue with retry/edit/dismiss + printable offline receipt, customer display via Socket.IO, browser print + print-job queue API + reference print agent, record-only card terminal. **Not production-complete for:** real terminal capture, full OIDC/Shopify outbound, httpOnly access-token auth.

---

# P0 — Remaining Critical Issues

No open P0 code blockers remain from the original audit. Pass 1–3 fixes were re-verified in source; see **COMPLETED / VERIFIED** and **REGRESSIONS**.

| ID | Feature | Status | Evidence | Files | Required Action |
|----|---------|--------|----------|-------|-----------------|
| — | — | — | — | — | — |

---

# P1 — Remaining High Priority

| ID | Feature | Status | Evidence | Files | Required Action |
|----|---------|--------|----------|-------|-----------------|
| FEAT-PAY-TERM | Stripe Terminal / real card capture | **DEFERRED** | Dialog explicitly states record-only; no PaymentIntent/Terminal SDK | `frontend/src/components/pos/CardPaymentDialog.jsx`, `frontend/src/components/pos/HardwareDialog.jsx`, `backend/src/modules/payments/` | Integrate Stripe Terminal (or partner SDK) **or** keep record-only and never market capture; document in buyer deploy guide |
| SEC-TOKEN-LS | JWT session hardening | **PARTIALLY IMPLEMENTED** | Phase A: optional `httpOnly` refresh cookie when `AUTH_COOKIE_MODE=true`; **access token still in `localStorage`** | `backend/src/modules/auth/auth.controller.js`, `backend/src/config/index.js` (`cookieMode`), `frontend/src/features/auth/authSlice.js` | Complete Phase B: access token in httpOnly cookie + CSRF; until then document XSS risk and enforce logout revocation |
| POS-REG-API | Backend register/shift enforcement | **COMPLETED** | `createPOSOrder` validates open shift + drawer when `staff_pro` + `require_register_session`; pure helpers in `orders.register-gate.js` | `backend/src/modules/orders/orders.service.js`, `orders.register-gate.js`, `tests/unit/register-gate.test.js` | — |
| FEAT-SH-SYNC | Bidirectional Shopify inventory | **PARTIALLY IMPLEMENTED** | Import worker live; `queueInventoryPush` logs + emits event only (no Shopify API push) | `backend/src/modules/integrations/shopify/shopify.worker.js` (~205–208), Shopify UI import-only copy | Implement outbound inventory sync with webhook reconciliation, or keep import-only and label honestly |
| SSO-OIDC-FULL | Production OIDC SSO | **PARTIALLY IMPLEMENTED** | JWKS signature verification in `_verifyIdToken`; callback still client-driven token exchange; stub gated by env | `backend/src/modules/sso/sso.service.js` (~263–278) | Complete server-side code→token exchange; disable stub in production; hide enterprise SSO UI until done |
| BRAND-EYZ-DOCKER | Docker/DB `eyz_*` naming | **PARTIALLY IMPLEMENTED** | Network alias `codexpos-worker` added; container still `eyz-worker`; DB defaults `eyz_pos` / `eyz_user` | `docker-compose.yml` (~70–84), `backend/src/config/index.js` (~12–14) | Coordinated rename with volume/`DATABASE_URL` migration (deploy continuity) |
| MARKETPLACE-STUBS | Real marketplace adapters | **STUB** | WooCommerce import live; Amazon/eBay/TikTok/Meta/Google return stub messages | `backend/src/modules/marketplace/marketplace.service.js`, `frontend/src/pages/business/Marketplace.jsx` | Ship one additional channel end-to-end or keep honest stub labels |

---

# P2 — Remaining Features

| ID | Feature | Status | Evidence | Files | Required Action |
|----|---------|--------|----------|-------|-----------------|
| FEAT-KDS | Kitchen / restaurant KDS | **MISSING** | No KDS tickets, modifiers, or table service in codebase | — | New `restaurant_pro` vertical pack |
| FEAT-I18N | Full i18n | **PARTIALLY IMPLEMENTED** | `LocaleContext` + minimal `dictionaries.js`; most UI English | `frontend/src/contexts/LocaleContext.jsx`, `frontend/src/i18n/dictionaries.js` | Expand dictionaries or adopt i18n library for POS + business UI |
| FEAT-PAYPAL | PayPal provider | **MISSING** | Stripe + stub only in payments providers | `backend/src/modules/payments/providers/` | Add PayPal adapter for storefront/POS if needed |
| FEAT-LABEL | Barcode shelf labels | **PARTIALLY IMPLEMENTED** | Product barcodes + receipt print jobs; no label templates | `backend/src/modules/print/print.service.js`, POS product catalog | Label layout templates + agent path for shelf labels |
| FEAT-PROMO | Advanced promotions | **PARTIALLY IMPLEMENTED** | Coupon codes at POS/checkout only | `backend/src/modules/coupons/` | BOGO, stack rules, time windows |
| SEC-RLS | PostgreSQL RLS | **MISSING** | App-layer `tenant_id` scoping only | — | Optional defense-in-depth policies per tenant table |
| FEAT-MAIN-WEB | Marketing site deploy | **PARTIALLY IMPLEMENTED** | `main-website/` isolated; not in compose | `main-website/`, `docker-compose.yml` | Add compose service or CDN deploy story |
| FEAT-FEFO | Expiry / FEFO alerts | **PARTIALLY IMPLEMENTED** | Batch CRUD + consume on sale | `backend/src/modules/products/catalog-tracking.service.js` | FEFO picking + expiry alert reports |
| FEAT-MCURRENCY | Multi-currency / FX | **PARTIALLY IMPLEMENTED** | Exchange rate upsert in accounting | `backend/src/modules/accounting/accounting.service.js` | POS/storefront FX conversion in `finance_pro` |
| FEAT-FRANCHISE | Franchise HQ UX | **PARTIALLY IMPLEMENTED** | Orgs rollup API | `backend/src/modules/orgs/orgs.service.js` | Deep HQ dashboard, royalties |
| FEAT-PUSH | Web push / FCM | **MISSING** | — | — | Push subscriptions for `marketing_pro` |
| FEAT-GL-EXPORT | QuickBooks / Xero export | **MISSING** | Manual GL + CSV reports partial | `backend/src/modules/accounting/` | Standard accounting export connectors |
| FEAT-GDPR-PORTAL | GDPR self-service | **PARTIALLY IMPLEMENTED** | Staff compliance endpoints | `backend/src/modules/compliance/` | Storefront customer privacy center |
| FEAT-SCIM-PROD | SCIM production-grade | **STUB** | Basic SCIM stubs in SSO module | `backend/src/modules/sso/sso.routes.js` | Enterprise hardening if marketed |

---

# COMPLETED / VERIFIED

Pass 1–3 audit fixes and POS implementation-log items confirmed in current code.

### Release 1 blockers (P0) — fixed, not regressed

| ID | Summary | Evidence |
|----|---------|----------|
| BUG-INV-001 | Transfer outbound decrements | `branch-stock.service.js` `_isDecrement('transfer')` → decrement (~99–112) |
| BUG-ORD-001 | Refund restock offsets prior returns | `orders.helpers.js` `restockQtyAfterReturns`; used in `refundOrder` |
| BUG-SHIFT-001 | Shifts use `employees.name` | `shifts.service.js` (~52–55, ~80) |
| BUG-EMP-001 | PIN verify uses `employees.name` | `employees.routes.js` verify-pin handler |
| BUG-PAY-001 | Production defaults `PAYMENT_PROVIDER=stripe`; stub gated | `config/index.js` (~73–77) |
| BUG-NGX-001 | Tenant vhost `*.codexpos.store` | `docker/nginx/conf.d/eyz.conf` |
| BUG-INV-003 | Product create/update syncs `branch_stock` | `products.service.js` via branch-stock service |
| BUG-INV-004 | Stock-take uniqueness includes `variant_id` | `inventory.service.js` |
| BUG-AUTH-003 | Logout revokes refresh server-side | `authSlice.js` + `POST /auth/logout` |
| WORKER-VERIFY | Worker in compose + documented | `docker-compose.yml` `eyz-worker`; `DEPLOYMENT.md` |

### P1 fixes — fixed

| ID | Summary | Evidence |
|----|---------|----------|
| BUG-POS-001 | Split/gift-card sets `payment_status=paid` | `orders.helpers.js` `derivePaymentFields`; `financial-integrity.test.js` |
| BUG-AUTH-001/002 | PIN requires linked user; POS unlock via verify-pin | `employees.routes.js`, `POS.jsx` (~554) |
| BUG-DRW-001 | Expected cash = float + cash sales − refunds + movements | `drawer.service.js` `computeExpected` (~61–123); migration `017_register_cash_movements.sql` |
| BUG-INV-002 | Adjustment honors deduct / negative qty | `branch-stock.service.js`; Inventory UI |
| BUG-SER-001 | Returned serials → resellable `in_stock` | `catalog-tracking.service.js` |
| BUG-BND-001 | Bundle sale_price allocation | `catalog-bundle.service.js` |
| BUG-DOM-001 | Custom domains require verified status | `middleware/tenant.js` |
| BUG-SSO-001 | No account creation from client email | `sso.service.js` |
| BUG-ROLE-001 | Custom role permissions merged in auth | `middleware/auth.js` |
| FEAT-POS-GC | Gift card tender dialog + button | `GiftCardPaymentDialog.jsx`, `POS.jsx` |
| FEAT-POS-LOY | Loyalty tender + backend redeem | `LoyaltyPaymentDialog.jsx`, `orders.service.js` loyalty redeem |
| BUG-POS-002 | POS tax via `posTax.js` + tax_rules | `frontend/src/utils/posTax.js`, `POS.jsx` |
| BUG-POS-003 | Offline printable receipt | `SaleSuccessDialog.jsx` offline path; `buildOfflineReceiptData` in `posHelpers.js` |
| BUG-PWA-001 | SW shell cache only | `frontend/public/sw.js` `codexpos-pos-shell-v3` (~47–53) |
| BUG-RPT-002 | Scheduled reports worker tick | `workers/queues.js` |
| BUG-RPT-SCHED-UI | Schedule create/list/delete UI | `Reports.jsx` (~51–67, ~310–360) |
| Reports | Tax + payment-mix tabs wired | `Reports.jsx` |
| TEST-E2E | Financial integrity unit suite | `backend/tests/unit/financial-integrity.test.js` (15 tests) |

### POS implementation log — verified complete

| ID | Summary | Evidence |
|----|---------|----------|
| BUG-ORD-002 | GC + loyalty reversal on returns | `orders.service.js` `returnOrder` (~765–811) `tender_reversals`; `ReturnRefundDialog.jsx` |
| BUG-RACE-001 | Stock row locking on sale | `branch-stock.service.js` `lockQuantity` FOR UPDATE (~40–50); used in `orders.service.js` (~117) |
| BUG-OFF-001 | Offline failed-queue UX | `offlineQueue.js` dismiss/retry/edit; `OfflineQueueDialog.jsx`; `flushSingle` in `useOfflineOrderSync.js` |
| POS auth / void / price override | Manager PIN for void, discount, price override | `employees.auth.js`; `cartSlice.js` `voidLine`; `orders.service.js` `_validateManagerDiscount`, `_validatePriceOverrides`; void notes (~383–384) |
| STOREFRONT-LOY | Storefront loyalty redeem | `Checkout.jsx` loyalty fields; `storefront.checkout.service.js`; `orders.service.js` `loyalty_points_to_redeem` (~440) |
| FEAT-ACC-AUTO | Auto GL from sales/returns (toggle) | `accounting.service.js` `postOrderPaid`/`postOrderReturn`; `settings.accounting.auto_gl_posting` |
| SEC-UPLOAD | Catalog-only public upload paths | `media.routes.js` signed URL or `isPublicCatalogPath` (~16–22) |
| BUG-AI-001 | AI routes gated `ai_pro` | `ai.routes.js` all routes use `requireFeature('ai_pro')` |
| FEAT-PRINT-AGENT | Reference print agent | `tools/print-agent/index.js` claim/complete/fail loop |
| SEC-TOKEN-LS Phase A | Optional httpOnly refresh cookie | `auth.controller.js` `setRefreshCookie`; `AUTH_COOKIE_MODE` |
| BUG-POS-004 | Dead `heldOrders` removed from cart slice | `cartSlice.js` — no `heldOrders`; hold is server-side via `HeldSalesDialog.jsx` + `GET /orders/held` |
| FEAT-CUST-DISP | Customer-facing display | `CustomerDisplay.jsx`; `POST /pos/display` in `pos.routes.js`; `POS.jsx` emit (~177–190); route `/pos/display` in `App.jsx` |

### POS feature areas — verified

| Area | Status | Evidence |
|------|--------|----------|
| **Register / shift gate** | **COMPLETED** (frontend + API) | `RegisterGate.jsx`; `POS.jsx` gate; `orders.service.js` `_validateRegisterSession`; `orders.register-gate.js` |
| **Cash control** | **COMPLETED** | `CashManagementDialog.jsx` → `POST /drawer/:id/movements`; `computeExpected` includes `cash_in`/`cash_out`; migration `017_register_cash_movements.sql` |
| **Register close (Z)** | **COMPLETED** | `CloseRegisterDialog.jsx` — Z-report + drawer close + clock-out in one flow (~51–67) |
| **Receipt history** | **COMPLETED** | `ReceiptHistoryDialog.jsx` → `POST /print/receipts`; browser HTML reprint |
| **Returns / refunds POS** | **COMPLETED** | `ReturnRefundDialog.jsx` → `POST /orders/:id/return`; proportional GC credit + loyalty restore/clawback |
| **Manager auth** | **COMPLETED** | `ManagerOverrideDialog.jsx`; backend `verifyManagerPin`; cart void + price override flows in `POS.jsx` |
| **Split payment auto-balance** | **COMPLETED** | `SplitPaymentDialog.jsx` `balancePeers`; `frontend/tests/unit/split-payment-balance.test.js` (11 cases) |
| **Cash payment** | **COMPLETED** | `CashPaymentDialog.jsx` quick cash chips + change calc (`cashQuickAmounts`, `due`, `change`) |
| **Offline sync** | **COMPLETED** | `useOfflineOrderSync.js`; IndexedDB `codexpos-offline`; sync handoff to server receipt; printable offline summary |
| **Customer display** | **COMPLETED** | Socket `pos.display` event; second-screen route |
| **Printing** | **COMPLETED** (API + browser + reference agent) | `print.routes.js` claim/complete/fail; `print.service.js`; `HardwareDialog.jsx` documents agent path |
| **Tips** | **COMPLETED** | `POS.jsx` `tipAmount`; `settings.preferences.pos_tips_enabled`; passed to order payload |
| **Barcode scan** | **COMPLETED** | `POS.jsx` `handleBarcode` (~609–627); `POSSearch.jsx` hit/miss feedback; snackbar on miss |
| **Full-screen POS layout** | **COMPLETED** | `POSLayout.jsx` viewport shell |
| **Pin lock** | **COMPLETED** | `PinLockOverlay.jsx`; verify-pin without JWT corruption (`POS.jsx` ~554) |
| **Financial integrity** | **COMPLETED** | `lockQuantity` + sale decrement; `allocateProportionalRefund` on returns |
| **Feature packs / RBAC on POS routes** | **COMPLETED** | `drawer.routes.js`, `shifts.routes.js`, `pos.routes.js`, `print.routes.js` — `authenticate`, `requireTenant`, `requireFeature`, `authorize` |
| **Held sales** | **COMPLETED** | Server-side hold/resume; `HeldSalesDialog.jsx` |
| **Variants / serials / batches** | **COMPLETED** | `VariantPickerDialog.jsx`; serial/batch fields in order payload |
| **Tax advanced** | **COMPLETED** | `estimateCartTax` with `tax_rules` when `tax_advanced` feature |

---

# DEFERRED

Intentionally not shipped in this audit pass; documented or stubbed honestly.

| Item | Reason | Evidence |
|------|--------|----------|
| Stripe Terminal / real card capture | Hardware + gateway integration | `CardPaymentDialog.jsx` record-only copy |
| Full bidirectional Shopify | Feature work beyond import | `shopify.worker.js` stub push; UI import-only |
| Docker `eyz-*` container/DB rename | Deploy continuity (volumes, `DATABASE_URL`) | `docker-compose.yml`, `config/index.js` defaults |
| Full httpOnly access-token auth | Invasive SPA migration | Phase A refresh cookie only; logout revocation interim |
| KDS / restaurant / payroll / B2B / white-label / vendor portal / DB RLS | Out of scope surgical pass | Gap analysis Phase 3+ |
| Abandoned cart UI polish | Worker drains queue; Marketing lists carts | `workers/queues.js` billing lifecycle |
| Production ESC/POS without DIY wiring | Reference agent logs payload unless `PRINTER_HOST` set | `tools/print-agent/index.js` (~57–64) |

---

# REGRESSIONS

Spot-checks of Pass 1–3 fixes and POS implementation-log claims found **no regressions**.

| Check | Result | Evidence |
|-------|--------|----------|
| Transfer decrement | OK | `branch-stock.service.js` `_isDecrement('transfer')` |
| Split `payment_status` | OK | `derivePaymentFields` → `paid` + `split` |
| Shifts/PIN SQL | OK | `e.name` in shifts + employees routes |
| Drawer expected cash | OK | `computeExpected` includes tenders, refunds, movements |
| Nginx subdomain | OK | `*.codexpos.store` in `eyz.conf` |
| Offline receipt | OK | `buildOfflineReceiptData` + `SaleSuccessDialog` offline print |
| SW API cache | OK | No cache when `authorization` or tenant headers present |
| Return tender reversal | OK | `returnOrder` GC credit + loyalty restore/clawback |
| Stock locking | OK | `lockQuantity` FOR UPDATE in sale path |
| Payment provider default | OK | Production → `stripe`; stub gated |

---

# RECOMMENDED NEXT IMPLEMENTATION ORDER

1. **P1 ops hardening** — staging VERIFY-WORKER + VERIFY-STRIPE; manual VERIFY-REG-GATE against API bypass.
2. **Honest payments (P1 deferred)** — Keep `FEAT-PAY-TERM` record-only documented; plan Terminal SDK only if marketed.
3. **Enterprise partials (P1)** — `SSO-OIDC-FULL` server-side token exchange; `SEC-TOKEN-LS` Phase B httpOnly access.
4. **Commerce depth (P1)** — One real `MARKETPLACE-STUBS` channel or maintain stub labels; scoped `FEAT-SH-SYNC` outbound if Shopify buyers need sync.
5. **Deploy continuity (P1)** — Plan `BRAND-EYZ-DOCKER` coordinated rename when volumes can migrate.
6. **Manual QA (needs verification)** — `E2E_LIVE=1` financial smoke; two-register race (`VERIFY-RACE`); print agent against staging (`VERIFY-PRINT`).
7. **P2 vertical / competitive** — `FEAT-KDS`, `FEAT-I18N`, `FEAT-LABEL`, advanced `FEAT-PROMO`.
8. **Long horizon (P2)** — Franchise, B2B, payroll, RLS, SCIM prod, GL export.

---

# Needs Manual Verification

| ID | Area | What to verify |
|----|------|----------------|
| VERIFY-E2E | QA | `E2E_LIVE=1` Playwright financial smoke against staging API |
| VERIFY-WORKER | Ops | `eyz-worker` / `codexpos-worker` alias running; scheduled reports, Shopify import, cart recovery execute |
| VERIFY-STRIPE | Billing | Subscription checkout + webhook; stub confirm disabled in production |
| VERIFY-PRINT | Hardware | Reference agent at `tools/print-agent/index.js` claims and completes ESC/POS job |
| VERIFY-RACE | POS | Two registers selling last unit — expect one failure |
| VERIFY-REG-GATE | POS | With `staff_pro`, cannot complete sale until register open; attempt API bypass without shift |
| VERIFY-SSO | Enterprise | Real IdP OIDC; stub disabled in production |
| VERIFY-SUBDOMAIN | Deploy | `{slug}.codexpos.store` storefront on Docker nginx |

---

*Read-only audit. No application code, migrations, or configs were modified. Only this document was created/updated.*
