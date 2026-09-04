# PROJECT BRIEF — PosHive

You are helping me work on **PosHive** (domain **poshive.store**). This is a production multi-tenant SaaS Point of Sale + Inventory + eCommerce storefront platform.

Treat this document as the source of truth for architecture, stack, folders, modules, auth, tenancy, and conventions. Prefer matching existing patterns over inventing new ones.

---

## 1. What the product is

**PosHive** is a multi-tenant SaaS where:

1. **Super Admin** runs the platform (tenants, plans, billing, CMS, support, SMTP, email templates/logs).
2. **Business owners / staff** run a tenant dashboard: POS, products, inventory, orders, customers, team, reports, settings, integrations.
3. **Public customers** shop on a **tenant storefront** (`{slug}.poshive.store` or custom domain).

Target: many businesses on one shared PostgreSQL schema, isolated by `tenant_id`.

Live-style domains:

- App / admin UI: `poshive.store` (and admin routes under `/admin`)
- API: `api.poshive.store`
- Storefronts: `{tenant-slug}.poshive.store` or custom domains via `tenant_domains`

---

## 2. Monorepo layout

```
POS/
├── backend/                 # Node.js Express API (port 5000 default)
│   └── src/
│       ├── app.js           # Route mounting, middleware
│       ├── server.js        # HTTP + Socket.IO
│       ├── config/          # env, DB, Redis, JWT, SMTP, Stripe, etc.
│       ├── database/
│       │   ├── migrations/  # 001–014 SQL files
│       │   ├── migrate.js
│       │   └── seed.js
│       ├── middleware/      # auth, tenant, validate, audit, features, rate limits
│       ├── modules/         # Feature modules (routes/controller/service/…)
│       ├── services/        # Cross-cutting (email, sms)
│       ├── workers/         # BullMQ queues (email, Shopify import, notifications)
│       ├── realtime/        # Socket.IO
│       ├── shared/          # response helpers, plan-limits, features, errors
│       └── utils/           # logger, crypto (AES-256-GCM)
├── frontend/                # React + Vite + MUI SPA
│   └── src/
│       ├── App.jsx          # Routes for admin / business / storefront / auth
│       ├── pages/admin/
│       ├── pages/business/
│       ├── pages/storefront/
│       ├── layouts/         # AdminLayout, BusinessLayout
│       ├── services/        # axios API clients, realtime
│       ├── hooks/
│       └── store/           # Redux Toolkit
├── docker/                  # Nginx + Docker configs
├── docs/                    # ARCHITECTURE, API, DATABASE, DEPLOYMENT, FEATURE_PACKS
├── e2e/
├── docker-compose.yml
└── README.md
```

Package names still say `eyz-pos-*` in places; product branding is **PosHive** / **PosHive** and domain **poshive.store**.

---

## 3. Tech stack

| Layer | Tech |
|--------|------|
| Frontend | React 18, Vite, MUI 6, Redux Toolkit, TanStack Query, React Router 7, React Hook Form, Axios, **Recharts** (mandatory for charts), Socket.IO client |
| Backend | Node.js ≥18, Express 4 |
| DB | PostgreSQL (`pg` pool) |
| Cache / queue | Redis + **BullMQ** |
| Auth | JWT access (short) + refresh tokens, bcrypt, RBAC |
| Email | Nodemailer; DB-managed SMTP; email queue + logs + templates |
| Payments | Stripe (or stub provider) |
| Realtime | Socket.IO (tenant rooms) |
| Files | Local or S3/Spaces; signed URLs |
| Validation | Joi |
| Logging | Winston |
| Security | Helmet, CORS, express-rate-limit, parameterized SQL |
| Charts rule | Always use **Recharts** for React charts |

API prefix: **`/api/v1`**

---

## 4. Architecture principles

1. **Tenant isolation first** — almost every business table has `tenant_id`; queries must scope by it.
2. **Layering** — Routes → Controllers → Services → (Repository / SQL) → PostgreSQL.
3. **RBAC** — middleware `authenticate` → `authorize(permission)` / `requirePlatformAdmin` / `requireTenantAccess`.
4. **Feature packs** — plan + tenant overrides gate features (`requireFeature`, frontend `useTenantFeatures`).
5. **Async work** — BullMQ for emails, Shopify import, notifications (SMS/WhatsApp/email).
6. **Audit** — mutations often go through `auditLog` middleware.
7. **Response shape** — shared helpers return `{ success, data/message/code }` style JSON; 404 uses `code: "NOT_FOUND"`.

### Request middleware order (typical)

`helmet → cors → compression → json → rateLimit → tenantResolver → (per-route) authenticate → requireTenant → authorize → validate → controller`

---

## 5. Multi-tenancy

**Model:** Shared DB, shared schema, row-level `tenant_id`.

**Resolution:**

1. Host header (subdomain or custom domain).
2. Lookup `tenant_domains`.
3. Attach `req.tenant`.
4. Services/repos filter by `tenant_id`.

**Platform vs tenant:**

- Platform admin users: no business tenant (or platform roles).
- Business users: belong to a tenant; must not see other tenants’ data.

Custom domains + DNS verification (TXT like `codexpos-verify`) live under domains/settings.

---

## 6. Auth & RBAC

**Flow:** JWT access token in Authorization header; refresh tokens stored server-side.

**Role model:**

```
users → user_roles → roles → role_permissions → permissions
```

**Platform roles** (`tenant_id` null): e.g. `super_admin`, `support_agent`, `billing_manager`, `content_manager`.

**Tenant roles:** e.g. `business_owner`, `manager`, `cashier`.

**Important middleware:**

- `authenticate` — load user + roles + permissions
- `authorize('permission.name')` — permission check (super_admin often bypasses)
- `requirePlatformAdmin` — platform roles only
- `requireTenant` / `requireTenantAccess` — tenant context required

---

## 7. Subscription / feature packs

Plans (seeded): **Starter**, **Professional**, **Enterprise**.

Feature pack keys (examples):

- `pos_pro`, `catalog_pro`, `tax_advanced`, `inventory_pro`, `staff_pro`, `crm_pro`, `omnichannel`
- `allow_negative_stock`, `open_price_items`

Resolved via plan JSON + tenant `settings` override (`key = 'features'`).

Plan limits also cover things like transaction count / storage (`tenant_usage`, `plan-limits.js`).

---

## 8. Backend modules (high level)

Mounted under `/api/v1/...` in `backend/src/app.js`:

| Area | Paths / modules |
|------|------------------|
| Auth | `/auth` |
| Catalog | `/products`, `/categories`, `/brands` |
| Inventory | `/inventory`, `/transfers`, stock take |
| Sales | `/orders` (POS + online), `/drawer`, `/gift-cards` |
| CRM | `/customers`, loyalty-related, `/reviews` |
| Ops | `/employees`, `/team`, `/branches`, `/suppliers` (CRUD helper), `/expenses`, `/purchase-orders` |
| Commerce | `/storefront`, `/tenant-coupons`, `/marketplace` |
| Billing | `/billing`, `/plans`, `/subscriptions/*`, `/payments`, `/invoices` |
| Platform admin | `/businesses`, `/tickets`, `/cms`, `/affiliates`, `/audit-logs`, `/admin/email` |
| Integrations | `/integrations/shopify` |
| Developer API | `/api-keys`, `/public/v1` (API key auth) |
| AI | `/ai` |
| Compliance | `/compliance` (invoices PDF, GDPR) |
| Media | `/upload`, `/media` |
| Domains / settings | `/domains`, `/settings`, `/webhooks`, `/tax-rules`, `/activity` |

**Module pattern:** `{name}.routes.js`, `.controller.js`, `.service.js`, often `.validation.js`, sometimes `.repository.js`.

**Generic CRUD:** `modules/_crud` for simple entities like suppliers.

---

## 9. Major product features

### Business / POS

- POS checkout (tips, gift cards, payment intents, offline queue via PWA + IndexedDB + `client_order_id` idempotency)
- Products with variants, images, categories, brands, compare-at price, vendor/tags (Shopify-related)
- Inventory, transfers, stock take, purchase orders
- Customers, employees, team invites, cash drawer
- Branches, tax rules, expenses, reports, AI insights (reorder / copilot)
- Gift cards, coupons, reviews moderation, marketplace channel stubs
- Shopify product import (GraphQL bulk ops, BullMQ worker, mapping tables)
- Developers page: API keys + usage metering
- Settings: domains, feature packs, business config
- PWA: `manifest.webmanifest`, `sw.js`, offline order sync

### Storefront

- Public shop: home, product, cart, checkout, order confirmation
- Storefront customer accounts, addresses, wishlists
- Product reviews

### Super Admin

- Businesses, plans, subscriptions overview, billing, coupons, CMS
- Support tickets, affiliates, audit/impersonation logs
- **SMTP Configuration**, **Email Logs**, **Email Templates** under `/admin/settings/...`
- Dashboard email stats widget (sent / failed / queued)

### Email system

- Tables: `smtp_settings`, `email_logs`, `email_templates`
- Password encrypted (AES-256-GCM via `utils/crypto.js`); UI shows masked password
- Central `services/email.service.js` queues sends; worker uses `smtp.service.js`
- Admin APIs: `GET/PUT /admin/email/smtp`, `POST /admin/email/test`, logs, templates, send-test, stats
- Env SMTP is fallback if DB config missing/disabled

### Payments

- Provider abstraction (Stripe REST or stub)
- Checkout sessions for subscription upgrades; webhooks with raw body verification

### Realtime

- Socket.IO JWT auth; emit to tenant rooms (orders, Shopify import progress, notifications)

---

## 10. Database

Migrations in order:

| File | Purpose |
|------|---------|
| 001 | Core platform (tenants, users, RBAC, plans) |
| 002 | Business ops (products, orders, inventory) |
| 003 | Platform features (tickets, CMS, notifications) |
| 004–008 | Phases / security / feature packs / expenses |
| 009 | Payments + gift cards |
| 010 | Metering + API keys |
| 011 | Omnichannel (storefront customers, reviews, marketplace) |
| 012 | Compliance (invoices, GDPR) |
| 013 | Shopify integration maps + jobs |
| 014 | SMTP settings + email logs |

Commands:

```bash
cd backend
npm run migrate
npm run seed
```

**Seed logins (default):**

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@poshive.store | Admin@123456 |
| Business Owner | owner@demo.poshive.store | Owner@123456 |

After fresh migrate on a server, **seed is required** or business signup can fail (missing `business_owner` role).

---

## 11. Frontend structure

Three main UIs in one SPA:

1. **`/admin/*`** — Super Admin (`AdminLayout`)
2. **Business dashboard** — routes like `/`, `/pos`, `/products`, `/integrations/shopify`, etc. (`BusinessLayout`)
3. **Storefront** — public shop pages
4. **Auth** — login, register, reset password

Data: TanStack Query + Axios to `/api/v1`. Charts: Recharts only.

---

## 12. Background workers

`backend/src/workers/queues.js` (and `npm run worker`):

- Notification jobs (email / SMS / WhatsApp / in-app)
- Shopify import jobs
- Email delivery with retries (failed emails retried; logged in `email_logs`)

Redis must be running for queues; if Redis is down, some email paths may fall back to inline send.

---

## 13. Deployment notes (important)

Typical AWS layout:

- Nginx → `api.poshive.store` → Node backend
- Separate PM2 processes for **frontend** and **backend** (restarting frontend does **not** load new API routes)
- After `git pull` on backend: `npm install`, `npm run migrate`, optionally `npm run seed`, then **restart the backend PM2 process**
- Missing route `PUT /api/v1/admin/email/smtp` with JSON `code: NOT_FOUND` means Express is running **old code** (route not mounted), not an Nginx miss

Local quick start:

```bash
# backend
cd backend && npm install && npm run migrate && npm run seed && npm run dev
# frontend
cd frontend && npm install && npm run dev
# optional worker
cd backend && npm run worker
```

Docker: `docker-compose up -d` (see README / docs/DEPLOYMENT.md).

---

## 14. Coding conventions for AI assistants

When changing this codebase:

1. Keep **tenant_id** scoping on all tenant data.
2. Follow existing module file layout; don’t invent a new architecture.
3. Validate with **Joi**; protect with auth + permissions.
4. Encrypt secrets (SMTP password, Shopify tokens) with `utils/crypto.js`; never return raw secrets to the UI.
5. Use **Recharts** for any charts.
6. Prefer Material UI patterns already used in admin/business pages.
7. Wire new admin/business pages into `App.jsx` + the correct layout nav.
8. Add SQL migrations as new numbered files; do not rewrite old migrations casually.
9. Queue heavy/async work via BullMQ when similar features already do.
10. Do not commit secrets (`.env`). Domain branding is **poshive.store**, not eyz.com.

---

## 15. How I want you to help

When I ask you to implement or debug something in this project:

- Assume the architecture above.
- Ask for file paths / error payloads if something conflicts with this brief.
- Propose changes that fit Express modules + React/MUI pages.
- Call out migrate/seed/restart steps when backend schema or routes change.

---

## Related docs in this repo

- `docs/ARCHITECTURE.md` — system design deep dive
- `docs/DATABASE.md` — schema overview
- `docs/API.md` — API documentation
- `docs/DEPLOYMENT.md` — deploy guide
- `docs/FEATURE_PACKS.md` — feature pack keys and plan defaults
- `README.md` — quick start and overview
