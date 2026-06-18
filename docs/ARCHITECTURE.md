# Codex POS — System Architecture

## Overview

Codex POS is a multi-tenant SaaS platform designed to serve 10,000+ businesses with strict data isolation, horizontal scalability, and enterprise security.

## Design Principles

1. **Tenant Isolation First** — Every query scoped by `tenant_id`; no cross-tenant data leakage
2. **Layered Architecture** — Routes → Controllers → Services → Repositories → Database
3. **RBAC at Every Layer** — Permission checks in middleware and service layer
4. **Event-Driven Notifications** — Async processing via BullMQ
5. **Audit Everything** — All mutations logged with user, IP, entity

## Layer Diagram

```
Request
   │
   ▼
┌─────────────────────────────────────┐
│ Middleware Stack                     │
│  helmet → cors → rateLimit →        │
│  tenantResolver → authenticate →    │
│  authorize(permission) → validate   │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Controller (HTTP I/O only)          │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Service (Business Logic)            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Repository (Data Access + tenant_id)│
└─────────────────┬───────────────────┘
                  ▼
            PostgreSQL
```

## Multi-Tenant Strategy

**Pattern:** Shared Database, Shared Schema with `tenant_id` discriminator.

| Approach | Used | Reason |
|----------|------|--------|
| Row-level `tenant_id` | ✅ | Cost-effective, scales to 10K+ tenants |
| Schema per tenant | ❌ | Migration complexity |
| DB per tenant | ❌ | Operational overhead |

### Tenant Resolution Flow

```
1. Extract host from request (subdomain or custom domain)
2. Lookup tenant_domains table
3. Attach tenant to req.tenant
4. All repositories inject tenant_id in WHERE clauses
```

## RBAC Model

```
users ──► user_roles ──► roles ──► role_permissions ──► permissions
```

Platform roles (tenant_id = NULL):
- `super_admin`, `support_agent`, `billing_manager`, `content_manager`

Tenant roles (scoped to tenant):
- `business_owner`, `manager`, `cashier`

## Security

- JWT access tokens (15min) + HTTP-only refresh tokens (7d)
- bcrypt password hashing (12 rounds)
- Rate limiting per IP
- Helmet security headers
- Input validation via Joi
- SQL parameterized queries only
- Audit logs for all mutations

## Scalability

| Component | Strategy |
|-----------|----------|
| API | Horizontal scaling behind Nginx load balancer |
| Database | Read replicas, connection pooling (pg pool) |
| Cache | Redis for sessions, tenant lookup, rate limits |
| Queue | BullMQ workers for notifications, reports |
| Storage | S3/Spaces for images, receipts, backups |
| Search | PostgreSQL full-text (Phase 2+), Elasticsearch optional |

## Folder Structure

```
backend/src/
├── config/           # Environment, DB, Redis, JWT
├── database/
│   ├── migrations/   # SQL migration files
│   ├── migrate.js
│   └── seed.js
├── middleware/       # Auth, tenant, RBAC, validation, audit
├── modules/          # Feature modules (auth, products, orders...)
│   └── {module}/
│       ├── {module}.routes.js
│       ├── {module}.controller.js
│       ├── {module}.service.js
│       ├── {module}.repository.js
│       ├── {module}.validation.js
│       └── {module}.dto.js
├── shared/
│   ├── base.repository.js
│   ├── errors.js
│   └── response.js
├── workers/          # BullMQ job processors
├── utils/
└── server.js
```
