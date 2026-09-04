# PosHive POS Implementation Log

Date: 2026-08-12

## BUG-ORD-002 — Gift card + loyalty reversal on returns

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `gift-cards.service.js`, `loyalty.service.js`, `orders.service.js`, `ReturnRefundDialog.jsx` |
| API | `POST /orders/:id/return` — tender_reversals in response |
| DB | Uses `gift_card_transactions`, `loyalty_transactions` |
| Tests | `financial-integrity.test.js` (allocate + parse helpers) |

## BUG-RACE-001 — Stock row locking

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `branch-stock.service.js` (`lockQuantity`, FOR UPDATE in sale path), `orders.service.js` |
| Tests | Existing financial-integrity suite green |

## BUG-OFF-001 — Offline failed-queue UX

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `offlineQueue.js`, `useOfflineOrderSync.js`, `OfflineQueueDialog.jsx`, `POS.jsx` |
| Features | Per-row retry, JSON edit, dismiss with reason, `flushSingle` |

## POS auth / void / price override

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `employees.auth.js`, `cartSlice.js`, `CartItem.jsx`, `CartPanel.jsx`, `POS.jsx`, `orders.service.js` |
| Features | Pre-sale void (audited), manager price override, void notes on order |

## STOREFRONT-LOY

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `storefront.checkout.service.js`, `Checkout.jsx`, `orders.service.js` (`loyalty_points_to_redeem`) |
| API | `GET /storefront/loyalty-preview`, checkout payload field |

## BUG-RPT-SCHED-UI

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `reports.service.js`, `reports.routes.js`, `Reports.jsx` |
| API | `GET /reports/schedules`, `DELETE /reports/schedules/:id` |

## FEAT-ACC-AUTO

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `accounting.service.js`, `orders.service.js` |
| Toggle | `settings.accounting.auto_gl_posting` |

## SEC-UPLOAD / BUG-AI-001

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `media.routes.js` (catalog-only public paths), `ai.routes.js` (`ai_pro` gate) |

## SSO-OIDC-FULL (JWKS verify)

| Field | Detail |
|-------|--------|
| Status | PARTIAL — JWKS signature verification implemented; code exchange still client-driven |
| Files | `sso.service.js` (`_verifyIdToken`) |

## FEAT-SH-SYNC (scoped outbound)

| Field | Detail |
|-------|--------|
| Status | PARTIAL — `queueInventoryPush` stub + realtime event |
| Files | `shopify.worker.js` |

## FEAT-PRINT-AGENT

| Field | Detail |
|-------|--------|
| Status | COMPLETED (reference agent) |
| Files | `tools/print-agent/index.js` |

## BRAND-EYZ-DOCKER

| Field | Detail |
|-------|--------|
| Status | PARTIAL — `codexpos-worker` network alias; `CODEXPOS_DB_*` env fallbacks |
| Files | `docker-compose.yml`, `config/index.js` |

## SEC-TOKEN-LS Phase A

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `auth.controller.js`, `app.js` (cookie-parser), `config/index.js` |
| Env | `AUTH_COOKIE_MODE=true` |

## P2 — Customer display / BUG-POS-004

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `CustomerDisplay.jsx`, `pos.routes.js`, `POS.jsx`, `cartSlice.js` (removed dead `heldOrders`) |
| Route | `/pos/display` |

## FEAT-PAY-TERM

| Field | Detail |
|-------|--------|
| Status | DEFERRED — record-only card; no Stripe Terminal capture in this build |

## POS-REG-API — Backend register/shift enforcement

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `orders.register-gate.js`, `orders.service.js`, `shifts.service.js` (`findOpenAtBranch`) |
| API | `POST /orders` rejects POS sales without open shift + drawer when `staff_pro` + `require_register_session` |
| Tests | `backend/tests/unit/register-gate.test.js` |

## POS-RETURN-MGR — Return refund manager auth

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `orders.service.js` (`_validateReturnManagerAuth`), `ReturnRefundDialog.jsx`, `orders.validation.js` |
| Setting | `preferences.pos_return_manager_threshold` (default 100) |
| API | `POST /orders/:id/return` requires `manager_employee_id` + `manager_pin` when refund exceeds threshold |

## POS-BARCODE-UX — Barcode miss search action

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Files | `POS.jsx` — Snackbar "Search" action copies scanned value to product search |

## Tests run

- `backend`: `npm test -- tests/unit/financial-integrity.test.js` — 15/15 pass
- `backend`: `npm test -- tests/unit/register-gate.test.js` — pass
- `frontend`: `npm run build` — success

## FEAT-RESTAURANT Phase 1

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Feature pack | `restaurant_pro` |
| Migration | `019_restaurant_foundation.sql` |
| Backend | `backend/src/modules/restaurant/*` |
| API | `/restaurant/settings`, `/restaurant/dashboard`, `/restaurant/floors`, `/restaurant/tables`, session open/close |
| Frontend | `/restaurant`, `/restaurant/tables`, `/restaurant/settings` |
| Permissions | `restaurant.view`, `restaurant.manage`, `restaurant.tables.*`, `restaurant.settings.manage` |
| Tests | `restaurant-foundation.test.js` |
| Docs | `docs/CODEXPOS-RESTAURANT-KDS.md` |

## FEAT-RESTAURANT-AUTO-ENTITLEMENT

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Feature pack | `restaurant_pro` auto-enabled for `restaurant` business type |
| Migration | `021_restaurant_pro_auto_entitlement.sql` (backfill) |
| Backend | `business-types.js` (`isRestaurantBusinessType`), `restaurant-entitlement.service.js`, `features.js` (entitlements + client-protected keys), `onboarding.service.js`, `settings.service.js` |
| Frontend | `BusinessTypeSelection.jsx` (included copy), `Settings.jsx` (Included with your business type), `useTenantFeatures.js` |
| Security | `restaurant_pro` stripped from client feature toggles; backend-only sync |
| Tests | `restaurant-entitlement.test.js` |
| Docs | `docs/CODEXPOS-RESTAURANT-KDS.md` — Automatic Restaurant Entitlement |

## FEAT-RESTAURANT Phase 2 — Restaurant POS + Modifiers

| Field | Detail |
|-------|--------|
| Status | COMPLETED |
| Feature pack | `restaurant_pro` (unchanged) |
| Migration | `020_restaurant_modifiers.sql` |
| Backend | `modifiers/*`, `orders.service.js` (dining + modifier validation), `restaurant.service.js` (`getActiveOrderForTable`) |
| API added | `/modifiers/groups`, `/modifiers/options`, `/modifiers/products/:id`, `/restaurant/tables/:id/active-order` |
| API modified | `POST /orders` — dining fields, `selected_modifiers`, `item_notes`, `send_to_kitchen` |
| Frontend | `RestaurantModeSelector`, `RestaurantContextBar`, `TablePickerDialog`, `ModifierPickerDialog`, `SendToKitchenDialog`; `POS.jsx`, `cartSlice.js` |
| Permissions | Existing `restaurant.*`, `business.pos`, `business.products` (modifier CRUD) |
| Tests | `restaurant-pos-phase2.test.js`; financial-integrity, register-gate, restaurant-foundation green |
| Frontend build | `npm run build` — success |
| Docs | `docs/CODEXPOS-RESTAURANT-KDS.md` Phase 2 section |

### Phase 2 notes

- Send to kitchen is **UI-only** until Phase 3 KDS tickets.
- Retail POS unchanged when `restaurant_pro` disabled or mode set to Retail.
- Dine-in offline: table open/sync blocked; no fake sessions.
