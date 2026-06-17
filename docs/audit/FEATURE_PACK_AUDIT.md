
## Feature Pack Tests (FP-001 — FP-050)

| Test ID | Feature | Scenario | Steps | Expected Result | Status |
|---------|---------|----------|-------|-----------------|--------|
| FP-001 | POS Pro | Variant sale | Enable pos_pro, add variable product with variants, sell at POS | Variant picker shown; order created with variant_id | PASS |
| FP-002 | POS Pro | Hold sale | Hold cart with pos_pro on | Order status on_hold; API 403 when pack off | PASS |
| FP-003 | POS Pro | Resume held | Resume held sale with stock | Stock decremented; payment recorded | PASS |
| FP-004 | POS Pro | Return order | Process return on paid order | Partial return; restock optional | PASS |
| FP-005 | POS Pro | Manager discount | Discount >20% without PIN | 400 validation error | PASS |
| FP-006 | POS Pro | Manager discount approved | Discount >20% with valid PIN | Order completes | PASS |
| FP-007 | POS Pro | Quick keys | Configure pos_quick_keys in settings | Chips appear on POS | PASS |
| FP-008 | Catalog Pro | CSV import | POST /products/import with rows | Products created; 403 without pack | PASS |
| FP-009 | Catalog Pro | Bundle sale | Bundle product with components | Components expanded; stock decremented | PASS |
| FP-010 | Catalog Pro | Tenant coupons | Create coupon; apply at POS | Discount applied | PASS |
| FP-011 | Advanced Tax | Category rule | tax_advanced on, category rule | Line tax uses category rate | PASS |
| FP-012 | Advanced Tax | Tax exempt customer | Customer tax_exempt=true | Zero tax on order | PASS |
| FP-013 | Advanced Tax | Inclusive tax | Rule is_inclusive=true | Tax back-calculated | PASS |
| FP-014 | Inventory Pro | Stock transfer | Complete transfer between branches | Source decrements; destination increments | PASS |
| FP-015 | Inventory Pro | Stock take | Complete stock take session | Adjustments applied | PASS |
| FP-016 | Inventory Pro | PO receive | Receive PO with inventory_pro | Branch stock increased | PASS |
| FP-017 | Staff Pro | PIN verify | POST /employees/verify-pin | Valid PIN returns verified | PASS |
| FP-018 | Staff Pro | Drawer session | Open and close drawer | Session recorded | PASS |
| FP-019 | Staff Pro | PIN login | POST /auth/pin-login | Employee authenticated | PASS |
| FP-020 | CRM Pro | Loyalty earn | Paid order with customer | Points earned per settings | PASS |
| FP-021 | CRM Pro | Loyalty redeem | Redeem points on customer | Points deducted | PASS |
| FP-022 | CRM Pro | Customer tags | Update customer with tags | Tags persisted | PASS |
| FP-023 | Omnichannel | Storefront gate | omnichannel off | Storefront API 403 | PASS |
| FP-024 | Omnichannel | Webhooks | order.created event | Webhook dispatched | PASS |
| FP-025 | Omnichannel | Click & collect | Checkout with pickup | fulfillment_status awaiting_pickup | PASS |
| FP-026 | Allow Negative Stock | Zero stock sale | allow_negative_stock on, stock=0 | Sale succeeds | PASS |
| FP-027 | Allow Negative Stock | Block oversell | Pack off, stock=0 | Sale blocked | PASS |
| FP-028 | Allow Negative Stock | Resume held | Resume with zero stock and pack on | Sale completes | PASS |
| FP-029 | Open Price | Set price at POS | is_open_price product, pack on | Custom unit_price accepted | PASS |
| FP-030 | Open Price | Block without pack | Send unit_price override | Validation error | PASS |
| FP-031 | Feature flags | Nav hiding | Disable inventory_pro | Transfers/PO receive hidden | PASS |
| FP-032 | Feature flags | Plan ceiling | Enable pack not on plan via settings | Override capped | PASS |
| FP-033 | Multi-tenant | Cross-tenant products | Tenant A token, Tenant B product id | 404/403 | PASS |
| FP-034 | Multi-tenant | Branch stock scope | Query branch_stock | tenant_id enforced | PASS |
