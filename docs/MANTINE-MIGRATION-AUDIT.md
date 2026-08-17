# CodexPOS Mantine Migration Audit (Phase 0)

**Date:** 2026-08-12  
**Brand:** CodexPOS only  
**Scope:** Operational UIs (POS / Restaurant / KDS / Customer Display). Admin & business back-office stay on MUI.

---

## 1. Current UI architecture

| Layer | Stack |
|-------|--------|
| Framework | React **18.3.1** + Vite **6** |
| Routing | `react-router-dom` 7 — see `frontend/src/App.jsx` |
| State | Redux Toolkit (`cartSlice`, auth) + TanStack Query |
| UI library | **MUI 6** (`@mui/material`, `@mui/icons-material`) + Emotion |
| Theme | `AppThemeProvider.jsx` (light/dark via `localStorage` `themeMode`) + static `theme.js` |
| Global CSS | Almost none — MUI `CssBaseline` only; POS receipt print CSS at `components/pos/SaleReceipt.print.css` |
| Fonts | Inter via Google Fonts in `index.html` |

### Provider tree (`main.jsx`)

```
Redux Provider → QueryClientProvider → AppThemeProvider (MUI ThemeProvider + CssBaseline)
  → LocaleProvider → App (BrowserRouter)
```

No Mantine today. No Tailwind / Bootstrap / Chakra / Ant / shadcn.

### Route surfaces (operational vs admin)

| Route | Layout | Surface | Migrate? |
|-------|--------|---------|----------|
| `/pos` | `POSLayout` | Full-screen register | **Yes — priority** |
| `/pos/display` | none (page only) | Customer display | Yes (later) |
| `/kds` | `KDSLayout` | Kitchen display | Yes (later) |
| `/restaurant/*` | `BusinessLayout` | Restaurant admin | Yes (after POS) |
| `/dashboard`, products, orders, settings, … | `BusinessLayout` | Business back-office | **Stay MUI** |
| `/admin/*` | `AdminLayout` | Platform admin | **Stay MUI** |
| `/store/:slug/*` | `StorefrontLayout` | Customer storefront | **Audit only** (tenant-themed) |
| `/onboarding` | `OnboardingLayout` | Setup wizard | Stay MUI for now |
| Auth pages | `AuthLayout` | Login/register | Stay MUI for now |

`POS.jsx` (`pages/business/POS.jsx`) is the large orchestrator: cart, payments, offline, register gate, restaurant mode, kitchen send, shortcuts. **Business logic must not move** — only presentational children migrate.

---

## 2. MUI usage patterns

~200+ files import `@mui/material` and/or `@mui/icons-material`.

**Patterns in operational UI:**

- Layout: `Box`, `Grid`, `Stack`, `AppBar`/`Toolbar`, `Drawer`
- Feedback: `Dialog*`, `Snackbar`/`Alert`, `Chip`, `Skeleton`
- Forms: `TextField`, `MenuItem`, `InputAdornment`
- Icons: `@mui/icons-material` everywhere (keep during transition; no need for Tabler unless desired later)
- Shared admin primitives reused from POS: `EmptyState`, `ConfirmDialog`, `FeatureGate`

**Brand colors (CodexPOS blue):**

- Primary `#2563eb` / dark `#1d4ed8` / light `#3b82f6`
- Secondary `#7c3aed` (admin accent — operational UI can de-emphasize)
- Success `#10b981`, warning `#f59e0b`, error `#ef4444`
- BG light `#f8fafc` / paper `#ffffff`; dark `#0f172a` / `#1e293b`
- KDS uses a custom dark shell `#0d1117` / `#e6edf3` (not MUI palette)

---

## 3. Reusable shared components (mostly stay MUI)

| Component | Used by | Recommendation |
|-----------|---------|----------------|
| `EmptyState` / `EmptyStateIllustration` | POS grid, cart, admin | Keep MUI until POS-specific empty states; optional `CodexEmptyState` for ops later |
| `ConfirmDialog` | POS + admin | Stay MUI (admin shared) |
| `DataTable`, `PageHeader`, `StatCard` | Admin/business | Stay MUI |
| `FormDialog`, RHF fields | Admin forms | Stay MUI |
| `LoadingState` | Auth gate | Stay MUI |
| `FeatureGate` | KDS, restaurant | Keep (logic wrapper; UI chrome can change underneath) |
| Storefront `storefrontTheme.js` | Tenant branding | Separate system — do not fold into CodexPOS Mantine theme |

---

## 4. POS components — migrate first (shell)

Priority **1 — POS chrome / catalog** (high touch, low payment-risk):

| File | Role | Notes |
|------|------|-------|
| `layouts/POSLayout.jsx` | Full-viewport shell | Swap Box → Mantine layout |
| `POSHeader.jsx` | Register chrome | Menus, register status, brand |
| `POSSearch.jsx` | Barcode + search | Preserve refs / barcode focus |
| `CategoryBar.jsx` | Category chips | Touch-friendly |
| `ProductGrid.jsx` | Grid + empty/error | Keep EmptyState bridge or CodexEmptyState |
| `ProductCard.jsx` | Tile | Touch target ≥44px |
| `OfflineIndicator.jsx` | Online badge | Visual only |
| `SyncStatus.jsx` | Pending sync | Visual only |
| `RestaurantModeSelector.jsx` | Retail/Restaurant toggle | Visual only |
| `RestaurantContextBar.jsx` | Table/order context | After shell |

Priority **2 — Cart:**

| File | Notes |
|------|-------|
| `CartPanel.jsx` | Wire props unchanged |
| `CartItem.jsx` | Qty / void / price UI only |
| `CustomerSelector.jsx` | Autocomplete behavior |
| `PaymentSummary.jsx` | Display only |
| `PaymentButtons.jsx` | Large touch targets |

Priority **3 — Payment / register dialogs** (preserve logic, especially split auto-balance):

`CashPaymentDialog`, `CardPaymentDialog`, `SplitPaymentDialog`, `GiftCardPaymentDialog`, `LoyaltyPaymentDialog`, `SaleSuccessDialog`, `HeldSalesDialog`, `RegisterGate`, `CashManagementDialog`, `CloseRegisterDialog`, `ManagerOverrideDialog`, `ExitPOSDialog`, `PinLockOverlay`, etc.

Priority **4 — Restaurant POS widgets:**

`TablePickerDialog`, `ModifierPickerDialog`, `SendToKitchenDialog`

**Do not rewrite:** `posHelpers.js`, `posErrors.js`, `cartSlice.js`, `POSKeyboardShortcuts` handler logic (dialog chrome can migrate later; shortcut keys must keep working).

---

## 5. Remain on MUI (explicit)

- Entire `/admin/*` and `/` business layout pages (products, inventory, reports, settings, team, …)
- Shared admin components listed in §3
- Auth + onboarding pages (unless a later phase says otherwise)
- Storefront: **evaluate only** — tenant themes + cart checkout are a different product surface
- MUI packages must **not** be removed while dual-provider is active

Restaurant **admin** pages (`RestaurantDashboard`, `RestaurantTables`, `RestaurantSettings`) live under `BusinessLayout` and can migrate in a later ops wave, but they are not “admin platform” — they are operational. Prefer after POS cart/payments.

---

## 6. CSS / theme conflict risks

| Risk | Mitigation |
|------|------------|
| Dual CssBaseline / global resets (MUI + Mantine) | Keep one MUI `CssBaseline`; import `@mantine/core/styles.css` once; avoid double body font fights by aligning Inter in both themes |
| Emotion vs Mantine CSS variables | Nest `MantineProvider` inside MUI `ThemeProvider`; don’t mix `sx` and Mantine `style` on the same node unnecessarily |
| z-index: MUI Dialog vs Mantine Modal | Prefer one modal system per screen; during transition, keep payment dialogs on MUI until that phase |
| Portal / focus traps | Nested Dialog+Modal can steal Esc — POS shortcuts listen globally; test Esc while dialogs open |
| Icon color inheritance | MUI icons inside Mantine still work via `currentColor` |
| Dark mode sync | Wire Mantine `forceColorScheme` to existing `themeMode` from `AppThemeProvider` |
| KDS custom dark colors | Encode as Mantine theme tokens / CSS vars for KDS layout, don’t force light Codex blue |

---

## 7. Migration risks (business)

| Risk | Severity | Notes |
|------|----------|-------|
| Breaking barcode focus / refs | High | `POSSearch` forwardRef must stay |
| Keyboard shortcuts (F2/F4/F6/F8/Esc/⌘Enter) | High | Keep `POSKeyboardShortcuts` behavior; only restyle help dialog later |
| Split payment auto-balance | High | UI-only migration; no payment math changes |
| Offline queue / SW | Medium | Indicators only in shell phase |
| Send-to-kitchen / KDS | Medium | **Already wired to real APIs** — do not mock; see §9 |
| Parallel state/APIs | Critical to avoid | Reuse Redux + existing endpoints only |
| Full rewrite of `POS.jsx` | High | Surgical child swaps only |

---

## 8. Recommended migration order

1. **Phase 0** — This audit  
2. **Phase 1** — Install `@mantine/core@8` + `@mantine/hooks@8` (React 18 compatible; Mantine 9 requires React 19.2+)  
3. **Phase 2** — `design-system/` theme + wrappers + dual providers + `docs/MANTINE-MIGRATION.md`  
4. **Phase 3a** — POS shell: layout, header, search, categories, product grid/card, offline/sync indicators  
5. **Phase 3b** — Cart panel + payment buttons/summary  
6. **Phase 3c** — Payment & register dialogs  
7. **Phase 4** — Restaurant pages under `/restaurant`  
8. **Phase 5** — KDS full-screen Mantine (existing kitchen APIs)  
9. **Phase 6** — Customer display `/pos/display`  
10. **Phase 7** — Storefront: audit decision only; migrate only if ROI is clear  

After each phase: `cd frontend && npm run build`. Do not remove MUI.

---

## 9. Send to kitchen / KDS status (audit — no mocks)

**Status: Phase 3 kitchen tickets appear implemented in code** (docs file `CODEXPOS-RESTAURANT-KDS.md` still says “planned” / “UI-only” in places — doc drift).

Evidence in `POS.jsx` `handleSendToKitchen`:

1. May `POST /orders/hold` or append via `POST /restaurant/orders/:id/items`
2. Sends tickets via `POST /restaurant/orders/:id/kitchen/send` with `item_ids`
3. Updates cart via `applyKitchenStatuses` / `setRestaurantContext`
4. KDS page polls `/restaurant/kds/tickets` + Socket.IO `kitchen.ticket.*` events

`SendToKitchenDialog` is a confirmation UI only; ticket creation is real. **Migration must not invent fake KDS behavior.**

Doc debt: update `CODEXPOS-RESTAURANT-KDS.md` Phase 3 section when convenient; track UI migration bugs in `docs/MANTINE-MIGRATION-ISSUES.md`.

---

## 10. Storefront evaluation (audit only)

Storefront already has a **tenant-driven** theme (`storefrontTheme.js`), custom hero/cart/checkout, and public unauthenticated routes. Blindly converting to CodexPOS Mantine would fight merchant branding. **Recommendation:** leave on MUI (or current hybrid) until ops migration is stable; revisit as a separate project.

---

## 11. Success criteria for early phases

- Admin/business screens unchanged and still MUI  
- POS shell visually Mantine with CodexPOS blue tokens  
- Dual providers: MUI + Mantine coexist  
- Cart/payment/kitchen logic untouched  
- `npm run build` passes  
- Shortcuts and barcode focus still work
