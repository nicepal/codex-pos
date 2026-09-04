# PosHive Mantine Migration

**Brand:** PosHive  
**Started:** 2026-08-12  
**Updated:** 2026-08-13  
**Related:** [MANTINE-MIGRATION-AUDIT.md](./MANTINE-MIGRATION-AUDIT.md) · [MANTINE-MIGRATION-ISSUES.md](./MANTINE-MIGRATION-ISSUES.md)

---

## Goals

- Move **operational** UIs (POS, Restaurant ops, KDS, Customer Display) to Mantine for a faster, touch-first cashier UX.
- Move **business / admin dashboard** chrome and high-traffic pages to Mantine (this phase).
- **No** parallel APIs or cart/payment logic rewrites.
- Keep MUI packages installed while auth/storefront/remaining pages transition.

---

## Architecture (transitional)

```
main.jsx
  Redux → React Query → AppThemeProvider
    MUI ThemeProvider + CssBaseline     ← residual auth / storefront / some pages
    MantineProvider (codexTheme)        ← ops + business shell + migrated pages
      Notifications (Mantine)
      LocaleProvider → App
```

| Concern | Choice |
|---------|--------|
| React | 18.3 — **Mantine 8** |
| Design tokens | `frontend/src/design-system/theme/codexTheme.js` |
| Wrappers | `frontend/src/design-system/components/*` |
| Color mode | Shared `themeMode`; MUI `mode` + Mantine `forceColorScheme` stay in sync |
| Icons | Keep `@mui/icons-material` for now |
| Toasts (ops) | `@mantine/notifications` via `posNotify*` |

### Theme tokens (PosHive)

- Primary blue: `#2563eb` (Mantine palette `codex`, shade 6)
- Success / warning / error aligned with existing palette
- CSS vars: `--codex-bg`, `--codex-surface`, `--codex-touch-min`, `--codex-brand-primary`

---

## Migrated (current)

### Ops (prior phases)

POS layout/shell/dialogs, Restaurant pages, KDS, Customer Display — see prior log.

### Business dashboard shell (2026-08-13)

| Area | Files |
|------|--------|
| App shell | `ResponsiveDrawer.jsx` → Mantine `AppShell` (sidebar, header, dark mode, user menu) |
| Business layout | `BusinessLayout.jsx` (title **PosHive**) |
| Notifications | `NotificationBell.jsx` |
| Shared chrome | `PageHeader`, `EmptyState`, `EmptyStateIllustration`, `ConfirmDialog`, `FeatureGate`, `DataTable`, `StatCard`, `LoadingState`, `BulkDeleteToolbar`, `FormDialog`, `RHFTextField`, `RHFControllerField`, `ImageUpload` |

### Business pages on Mantine

| Page | Notes |
|------|--------|
| Dashboard home | `dashboard/index.jsx` + all `dashboard/components/*` |
| Products | list + filters + form dialog |
| Orders | list + branch filter |
| Customers | list + add dialog |
| Categories / Brands | CRUD tables |
| Accounting | FeatureGate + tabs (finance_pro) |
| Shifts | FeatureGate + clock in/out (staff_pro) |
| Manufacturing | FeatureGate + BOMs/orders (mfg_pro) |
| Marketing | mostly Mantine (verify tabs/forms) |

Restaurant / POS / KDS remain Mantine (unchanged this pass).

---

## Still MUI (intentional residual)

Pages still import `@mui/material` locally but render **inside Mantine AppShell** and use Mantine shared primitives (`PageHeader`, `DataTable`, `FormDialog`, etc.):

- Settings (+ Domains / Tax / Webhooks sections)
- ProductDetail, StockTake, Expenses (+ expense components)
- Reports, Subscription, Branches, Employees, Team
- Inventory, Transfers, Drawer, PurchaseOrders / PurchaseOrderDetail
- CustomerDetail, OrderDetail, Suppliers, GiftCards, TenantCoupons, Reviews
- Support, Developers, AiInsights, Marketplace
- Shopify integration subtree
- ProductsImportWizard, ColorPickerField, TicketDetailView

**Out of scope this pass**

- Auth + onboarding layouts/pages (may still use MUI `RHFTextField` bridge)
- Platform `/admin/*` pages (same shell component is Mantine; page bodies often still MUI)
- Storefront (do not migrate)

MUI packages remain installed.

---

## Feature packs / entitlements

`FeatureGate` presentation is Mantine; **logic unchanged** (`hasFeature(pack)`). Restaurant Pro / POS Pro entitled tenants must not see false upgrade walls — verify packs for restaurant business types.

---

## How to finish remaining pages

1. Replace local `@mui/material` with `@mantine/core` (Table/Badge/TextInput/NativeSelect/Modal/SimpleGrid).
2. Keep props, React Query, and RBAC identical.
3. Prefer shared `FormDialog` / `DataTable` / `PageHeader` (already Mantine).
4. Do not remove MUI until auth + storefront + residual pages are clear.
5. `cd frontend && npm run build` after each batch.

---

## Remaining work (order)

1. Settings + ProductDetail + Expenses + Reports (largest residual)
2. Inventory / Transfers / PO / StockTake
3. People: Employees, Team, CustomerDetail
4. Subscription / Branches / Developers / Support
5. Shopify + Marketplace
6. Auth/onboarding (optional later)
7. Remove MUI packages only after zero imports

---

## Packages

```json
"@mantine/core": "^8.x",
"@mantine/hooks": "^8.x",
"@mantine/notifications": "^8.x"
```

MUI packages remain installed.
