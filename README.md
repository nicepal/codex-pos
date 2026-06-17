# EYZ POS

Production-grade Multi-Tenant SaaS Point of Sale + Inventory Management + eCommerce Storefront Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                    │
│              *.poshive.store │ api.poshive.store │ admin.poshive.store            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend    │    │   Backend API   │    │   Storefront    │
│  React + MUI  │    │ Express + Node  │    │  Public React   │
└───────────────┘    └────────┬────────┘    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │     Redis     │    │  BullMQ Jobs  │
│  Multi-Tenant │    │    Cache      │    │ Notifications │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Multi-Tenant Model

- **Shared database, shared schema** with `tenant_id` on every tenant-scoped table
- **Automatic tenant scoping** via middleware + repository layer
- **Subdomain resolution**: `{slug}.poshive.store` → tenant context
- **Custom domains**: `www.store.com` → mapped via `tenant_domains`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Redux Toolkit, TanStack Query, MUI, React Hook Form |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | BullMQ |
| Auth | JWT + Refresh Tokens, RBAC |
| Storage | AWS S3 / DigitalOcean Spaces |

## Quick Start

```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start with Docker
docker-compose up -d

# Or run locally
cd backend && npm install && npm run migrate && npm run seed && npm run dev
cd frontend && npm install && npm run dev
```

## Default Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@poshive.store | Admin@123456 |
| Business Owner | owner@demo.poshive.store | Owner@123456 |

## API Documentation

See [docs/API.md](docs/API.md)

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Project Structure

```
eyz-pos/
├── backend/          # Express API server
├── frontend/         # React admin + business dashboard
├── docker/           # Nginx, Docker configs
├── docs/             # Architecture & API docs
└── docker-compose.yml
```

## Phases

1. ✅ Database Design, Folder Structure, Architecture
2. ✅ Backend APIs, Authentication, RBAC
3. ✅ Super Admin Panel
4. ✅ Business Dashboard
5. ✅ POS & Inventory
6. ✅ Public Storefront
7. ✅ Billing & Subscription
8. ✅ Notifications
9. ✅ Docker Deployment
# codex-pos
