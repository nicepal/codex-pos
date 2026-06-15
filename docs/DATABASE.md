# EYZ POS Database Schema

## Entity Relationship Overview

```
tenants ──┬── users ── user_roles ── roles ── role_permissions ── permissions
          ├── tenant_domains
          ├── subscriptions ── plans ── subscription_features
          ├── products ──┬── product_variants
          │              └── product_images
          ├── categories, brands
          ├── inventory_transactions
          ├── customers, suppliers, employees
          ├── orders ── order_items
          ├── expenses, tickets, notifications
          └── settings
```

## Multi-Tenant Isolation

Every tenant-scoped table includes `tenant_id UUID NOT NULL REFERENCES tenants(id)`.

**Platform-global tables** (no tenant_id):
- `roles` (platform roles have tenant_id = NULL)
- `permissions`
- `plans`
- `coupons`
- `email_templates` (tenant_id NULL = platform template)

## Indexes Strategy

- Composite indexes on `(tenant_id, status)` for filtered lists
- `(tenant_id, slug)` unique constraints for SEO URLs
- `(tenant_id, sku)`, `(tenant_id, barcode)` for POS lookup
- `audit_logs(created_at)` for time-range queries

## Migrations

| File | Description |
|------|-------------|
| `001_core_platform.sql` | Users, RBAC, tenants, plans, billing, audit |
| `002_business_operations.sql` | Products, inventory, orders, customers |
| `003_platform_features.sql` | Tickets, CMS, notifications, affiliates |

Run: `npm run migrate`

## Seed Data

- 20 permissions across platform & business modules
- 7 roles with permission mappings
- 3 subscription plans (Starter, Professional, Enterprise)
- Super admin user
- Demo tenant with business owner

Run: `npm run seed`
