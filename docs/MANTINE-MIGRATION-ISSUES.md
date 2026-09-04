# PosHive Mantine Migration Issues

**Brand:** PosHive  
**Started:** 2026-08-12  
**Updated:** 2026-08-13

Track bugs found during the Mantine migration. Prefer fixing UI-only issues safely; document anything that needs a follow-up or touches business logic.

---

## Open

| ID | Area | Notes | Severity |
|----|------|-------|----------|
| UI-2 | FeatureGate | Presentation now Mantine; still verify restaurant tenants with auto-entitlement never see false upgrade for `restaurant_pro` / `pos_pro`. | Low |
| DASH-1 | Residual pages | Many business pages still use local MUI (Settings, ProductDetail, Expenses, Reports, Subscription, etc.) inside Mantine shell + shared Mantine primitives. | Medium |
| LONG-2 | Storefront | Explicitly **not** migrated; tenant themes conflict with Codex ops tokens. | — |

---

## Fixed / mitigated in this pass

| ID | Area | Resolution |
|----|------|------------|
| LONG-1 | Admin/business shell | Business (and Admin) `ResponsiveDrawer` → Mantine AppShell; shared dashboard primitives migrated. |
| — | Dual CSS reset | Kept single MUI `CssBaseline`; Mantine styles imported once in `AppThemeProvider`. |
| — | Brand naming | Shell title uses **PosHive**. |
| DOC-1 | Kitchen docs | Phase 3 complete (prior). |
| RISK-1 | Dual modals | Ops on CodexModal; ConfirmDialog/FormDialog now Mantine for dashboard. |
| UI-1 | ReturnRefundDialog | Migrated earlier. |
| UI-3 | POS.jsx chrome | Migrated earlier. |
| — | Dashboard home | Full Mantine (KPIs, charts tokens via CODEX_TOKENS, panels). |
| — | High-traffic lists | Products, Orders, Customers, Categories, Brands on Mantine. |

---

## Not bugs (out of scope)

- Storefront not migrated (decision documented).
- Auth/onboarding can remain MUI for this pass.
- No fake KDS/payment behavior introduced.
- Card payment remains record-only by product design.
- MUI packages must stay until residual pages + auth/storefront are clear.
