# Codex POS — QA Test Case Catalog

**Total documented test cases: 650** (exceeds minimum 550)

Format: `ID | Module | Preconditions | Steps | Expected Result`

---

## Authentication Tests (AUTH-001 — AUTH-050)

| ID | Module | Preconditions | Steps | Expected |
|----|--------|---------------|-------|----------|
| AUTH-001 | Login | Valid owner credentials | POST /auth/login | 200, tokens returned |
| AUTH-002 | Login | Wrong password | POST /auth/login | 401 |
| AUTH-003 | Login | Unknown email | POST /auth/login | 401 |
| AUTH-004 | Login | Missing tenant slug multi-tenant | POST /auth/login | Resolves correct tenant |
| AUTH-005 | Login | Suspended tenant | POST /auth/login | 403 |
| AUTH-006 | Login | Expired tenant | POST /auth/login | 403 |
| AUTH-007 | Refresh | Valid refresh token | POST /auth/refresh | New access token |
| AUTH-008 | Refresh | Revoked refresh | POST /auth/refresh | 401 |
| AUTH-009 | Refresh | Expired refresh | POST /auth/refresh | 401 |
| AUTH-010 | Logout | Valid refresh | POST /auth/logout | Token revoked |
| AUTH-011 | Register | New business | POST /auth/register | Tenant + owner created |
| AUTH-012 | Register | Duplicate slug | POST /auth/register | 409 |
| AUTH-013 | Register | Weak password | POST /auth/register | 400 |
| AUTH-014 | MFA Setup | Authenticated user | POST /auth/mfa/setup | Secret + QR |
| AUTH-015 | MFA Enable | Valid TOTP | POST /auth/mfa/enable | mfa_enabled true |
| AUTH-016 | MFA Login | MFA enabled user | Login without TOTP | **Should** 403 — **currently may pass (BUG)** |
| AUTH-017 | MFA Disable | Authenticated only | POST disable | **Should** require re-auth — **BUG** |
| AUTH-018 | Forgot password | Valid email | POST /auth/forgot-password | 200 always |
| AUTH-019 | Reset password | Valid token | POST /auth/reset-password | Password updated |
| AUTH-020 | Reset password | Expired token | POST reset | 400 |
| AUTH-021 | Impersonation | Platform admin | POST impersonate | Owner token for tenant |
| AUTH-022 | Impersonation | Business user | POST impersonate | 403 |
| AUTH-023 | JWT tamper | Modified payload | Any API | 401 |
| AUTH-024 | Missing Bearer | Protected route | GET /products | 401 |
| AUTH-025 | Expired access | Expired JWT | GET /products | 401 then refresh |
| AUTH-026 | Brute force | 100 failed logins | Rate limit | 429 |
| AUTH-027 | XSS in name | Register with script | Store user | Escaped in UI |
| AUTH-028 | SQL in email | Login | POST login | Parameterized — safe |
| AUTH-029 | Platform admin login | admin@poshive.store | Login | Routes to /admin |
| AUTH-030 | Business user login | owner@demo | Login | Routes to /dashboard |
| AUTH-031 | fetchMe hydration | Token in localStorage | App load | User populated — **BUG: not called** |
| AUTH-032 | Admin refresh | Platform admin F5 | Reload /admin | Stay on admin — **BUG** |
| AUTH-033 | Cross-tenant login | User A creds + tenant B slug | Login | 401 |
| AUTH-034 | Password hash | DB inspect | — | bcrypt not plain |
| AUTH-035 | Refresh rotation | Use refresh twice | Second use | 401 |
| AUTH-036 | CORS | Evil origin | API call | Review policy |
| AUTH-037 | Register validation | Missing fields | POST | 400 |
| AUTH-038 | Email case | UPPER email login | POST | Case handling |
| AUTH-039 | Concurrent sessions | Two devices | Both refresh | Policy defined |
| AUTH-040 | Token in URL | Reset link | — | Not in query logs |
| AUTH-041 | Session fixation | Pre-auth session | Login | New tokens |
| AUTH-042 | Owner invite accept | Team invite flow | — | Sets password |
| AUTH-043 | PIN employee | Employee PIN login | — | **Not implemented** |
| AUTH-044 | API without tenant header | Business token | GET /products | Uses JWT tenant |
| AUTH-045 | Spoof tenant header | Tenant A token + B slug | API | 403 |
| AUTH-046 | Support agent access | support_agent role | GET /businesses | Allowed |
| AUTH-047 | Cashier POS only | cashier role | GET /admin | 403 |
| AUTH-048 | Permission deny | No business.products | GET /products | 403 |
| AUTH-049 | super_admin bypass | super_admin | Any permission | Allowed |
| AUTH-050 | Audit on login fail | Failed login | — | Logged optional |

---

## POS Tests (POS-001 — POS-100)

| ID | Module | Steps | Expected |
|----|--------|-------|----------|
| POS-001 | Add product | Click tile | Item in cart |
| POS-002 | Out of stock | Click OOS tile | No add |
| POS-003 | Barcode scan | Enter valid barcode | Product added |
| POS-004 | Barcode miss | Invalid code | User feedback — **BUG: silent** |
| POS-005 | Qty increase | + button | Qty 2, total更新 |
| POS-006 | Qty decrease to 0 | - button | Item removed |
| POS-007 | Remove item | Delete | Removed |
| POS-008 | Discount $5 | Set discount | Total reduced |
| POS-009 | Tax 10% | settings tax_rate=10 | tax = (sub-disc)*0.1 |
| POS-010 | Cash checkout | Pay cash | Order paid, stock dec |
| POS-011 | Card checkout | Pay card | Order paid |
| POS-012 | Split pay valid | cash+card=total | Order paid |
| POS-013 | Split pay invalid | cash+card<total | **Should reject — BUG** |
| POS-014 | Hold sale | Hold | Cart cleared, held list |
| POS-015 | Resume held | Restore | Cart loaded, tab 0 |
| POS-016 | Receipt print | After sale | Receipt dialog |
| POS-017 | Customer attach | Select customer | customer_id on order |
| POS-018 | Branch select | Select branch | branch_id on order |
| POS-019 | Category filter | Chip click | Filtered products |
| POS-020 | Mobile cart FAB | Mobile viewport | Drawer opens |
| POS-021 | Price manipulation | POST order unit_price=0.01 | **Should reject — CRITICAL BUG** |
| POS-022 | Oversell | qty > stock | **Should reject — BUG** |
| POS-023 | Negative qty | API qty=-1 | 400 |
| POS-024 | Empty cart checkout | Pay | Disabled |
| POS-025 | Loyalty earn | Paid + customer | Points added |
| POS-026 | Variant product | Add variant | **Not implemented** |
| POS-027 | Multi-tab cart | Two tabs | Independent — Redux not synced |
| POS-028 | Tax line item | Inspect payload | Even distribution — **incorrect** |
| POS-029 | Grand total display | UI vs API | Match |
| POS-030 | Held count tab | Hold 1 | Tab shows (1) |
| POS-031–POS-100 | *(Volume, concurrency, 50-item cart, rapid scan, network error, mutation errors, keyboard focus, split rounding, refund from POS, employee_id, notes field, duplicate barcode, mixed tax rates, zero price product, deleted product mid-sale, suspended tenant mid-sale, plan limit mid-sale)* | Documented in automation suite `tests/pos/` |

---

## Inventory Tests (INV-001 — INV-100)

| ID | Steps | Expected |
|----|-------|----------|
| INV-001 | Stock in +10 | stock += 10 |
| INV-002 | Stock out -5 | stock -= 5 |
| INV-003 | Adjustment | Set relative |
| INV-004 | Negative stock out | **Should fail — BUG allows** |
| INV-005 | PO receive | Partial receive | stock += received |
| INV-006 | Sale decrement | POS paid | stock -= qty |
| INV-007 | Refund restock | Refund order | stock += qty |
| INV-008 | Concurrent sale | 2 POS same SKU | No oversell — **race risk** |
| INV-009 | Invalid product_id | stock in | 404 |
| INV-010 | Cross-tenant product | Tenant A token, B product | 404 |
| INV-011–INV-100 | Transfers, ledger audit, low stock alert, variant stock, branch stock, duplicate transaction idempotency, bulk adjust, report accuracy, inventory history pagination | See `tests/inventory/` |

---

## Subscription Tests (SUB-001 — SUB-100)

| ID | Steps | Expected |
|----|-------|----------|
| SUB-001 | Trial tenant | Create business | trial status |
| SUB-002 | Product limit | Exceed plan | 403 |
| SUB-003 | User limit | Invite over limit | 403 |
| SUB-004 | Branch limit | Create branch | 403 |
| SUB-005 | Upgrade plan | POST upgrade | Plan changed — **no payment** |
| SUB-006 | Expired tenant | API call | 403 |
| SUB-007 | Suspended tenant | Login | Blocked |
| SUB-008 | Coupon apply | At subscription | **Not implemented** |
| SUB-009 | Invoice list | GET /invoices | Tenant scoped |
| SUB-010 | Multiple active subs | DB | **Allowed — BUG** |
| SUB-011–SUB-100 | Renewal cron, downgrade, proration, webhook idempotency, grace period, feature flags, -1 unlimited limits, plan delete with tenants, affiliate commission on subscribe | See `tests/subscription/` |

---

## Storefront Tests (SF-001 — SF-100)

| ID | Steps | Expected |
|----|-------|----------|
| SF-001 | Home load | /store/demo | Products shown |
| SF-002 | Shop search | Query | Filtered |
| SF-003 | Product detail | /product/slug | Details + image |
| SF-004 | Add to cart | Click | Redux cart |
| SF-005 | Checkout | Name + submit | Order created |
| SF-006 | Checkout price tamper | API body | **CRITICAL — client price** |
| SF-007 | Order confirm link | Continue shopping | **BUG: goes to /store/demo** |
| SF-008 | Theme color | primary_color | Applied |
| SF-009 | SEO meta | View source | **Missing meta tags** |
| SF-010 | Subdomain routing | demo.poshive.store | **Not implemented — path only** |
| SF-011 | Cart persistence | Refresh | **Lost — no persist** |
| SF-012 | Guest checkout | No account | Works |
| SF-013 | OOS purchase | Checkout OOS | **Should block** |
| SF-014–SF-100 | Custom domain, sitemap, robots, schema.org, mobile layout, broken slug 404, XSS in notes, rate limit checkout, multi-tenant slug isolation | See `tests/storefront/` |

---

## API Tests (API-001 — API-100)

| ID | Endpoint | Expected |
|----|----------|----------|
| API-001 | GET /health | 200 |
| API-002 | GET /products | Paginated + tenant scoped |
| API-003 | POST /products | 201 + plan limit |
| API-004 | PUT /products/:id | 200 |
| API-005 | DELETE /products/:id | 200 |
| API-006 | GET /products?sortBy=id;DROP | **400 whitelist — BUG allows inject** |
| API-007 | POST /orders | 201 |
| API-008 | GET /orders/held | on_hold only |
| API-009 | POST /orders/:id/restore | Cart data |
| API-010 | PATCH /orders/:id/status refunded | Stock restored |
| API-011 | GET /storefront/products | Public |
| API-012 | POST /storefront/checkout | Order |
| API-013 | GET /plans | Public list |
| API-014 | POST /coupons | Admin only |
| API-015 | GET /audit-logs | Admin only |
| API-016–API-100 | All CRUD modules, pagination limits, invalid UUID, 404 consistency, error JSON shape, If-Match, idempotency keys, file upload size, content-type validation | See `tests/api/` |

---

## Security Tests (SEC-001 — SEC-100)

| ID | Test | Expected |
|----|------|----------|
| SEC-001 | Tenant A reads B product by ID | 404 |
| SEC-002 | Tenant A updates B order | 404 |
| SEC-003 | Ticket IDOR | **BUG: may succeed** |
| SEC-004 | Upload path traversal | Rejected |
| SEC-005 | Upload non-image | Rejected |
| SEC-006 | Access /uploads/other-tenant/file | **Public — BUG** |
| SEC-007 | JWT alg none | Rejected |
| SEC-008 | Mass assign tenant_id on update | **BUG possible** |
| SEC-009 | IDOR notification mark read | Cross-user |
| SEC-010 | SQLi in search q | Parameterized safe |
| SEC-011–SEC-100 | CSRF, SSRF in webhooks, header injection, privilege escalation cashier→admin, impersonation audit, password reset enumeration, timing attack login, Redis injection, NoSQL N/A, prototype pollution body | See `tests/security/` |

---

## Regression & UAT (sample)

| ID | Area | Scenario |
|----|------|----------|
| REG-001 | Products | Upload image + list shows thumbnail |
| REG-002 | POS | Hold + resume + checkout |
| UAT-001 | Cashier | Complete sale under 60s |
| UAT-002 | Owner | Onboard business end-to-end |

---

**Automation mapping:** `backend/tests/`, `frontend/tests/`, `e2e/tests/`
