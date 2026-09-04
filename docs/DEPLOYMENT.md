# PosHive Deployment Guide

Two supported paths:

1. **Ubuntu + PM2 + Nginx** (this is the production path when you have a dedicated port range)
2. **Docker Compose** (all-in-one, including Postgres/Redis containers)

---

## Ubuntu + PM2 + Nginx (port range 8502–8900)

Public traffic enters **Nginx on 8502**. Node never listens on a public port.

| Service | Bind | Port | Public? |
|---------|------|------|---------|
| Nginx | `0.0.0.0` | **8502** | Yes — only this port is opened in UFW |
| API + Socket.IO | `127.0.0.1` | **8510** | No — Nginx proxies `/api/` and `/socket.io/` |
| BullMQ worker | — | none | No |
| PostgreSQL | `127.0.0.1` | 5432 | No |
| Redis | `127.0.0.1` | 6379 | No |
| Frontend SPA | static files | — | Served by Nginx |
| Marketing site | static files | — | Served by Nginx |

Do not publish 8510, 5432, or 6379. Those stay on localhost.

### 1. Server packages

```bash
# From a sudo user (not root)
sudo mkdir -p /opt/codexpos
sudo chown "$USER:$USER" /opt/codexpos
# copy or clone this repo into /opt/codexpos

cd /opt/codexpos
chmod +x deploy/scripts/*.sh
./deploy/scripts/setup-ubuntu.sh
```

`setup-ubuntu.sh` installs Node 20, Nginx, PostgreSQL, Redis, and PM2, then opens **8502/tcp** in UFW.

### 2. PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER poshive WITH PASSWORD 'codexpos@123';
CREATE DATABASE poshive_pos OWNER poshive;
GRANT ALL PRIVILEGES ON DATABASE poshive_pos TO poshive;
SQL
```

Production `DATABASE_URL` (the `@` in the password must be encoded as `%40`):

```
postgresql://poshive:codexpos%40123@127.0.0.1:5432/poshive_pos
```

### 3. Environment files

```bash
cp deploy/env/backend.production.example backend/.env
cp deploy/env/frontend.production.example frontend/.env.production
cp deploy/env/website.production.example main-website/.env.production
nano backend/.env
```

Required in `backend/.env`:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — `openssl rand -hex 32` each
- `UPLOAD_SIGNING_SECRET` — `openssl rand -hex 32`
- `DB_PASSWORD` and `DATABASE_URL` matching the role you created
- `APP_URL=https://app.poshive.store`
- `API_URL=https://poshive.store`
- `PLATFORM_DOMAIN=poshive.store`

Frontend production env uses same-origin `/api/v1` so the browser talks to Nginx, not to 8510.

### 4. First deploy

```bash
cd /opt/codexpos
./deploy/scripts/deploy.sh
```

That script:

- installs backend deps and runs migrations
- builds `frontend` and `main-website`
- copies `dist/` to `/var/www/codexpos/{frontend,website}`
- starts `codexpos-api` and `codexpos-worker` with PM2
- installs the Nginx site and reloads Nginx

Optional seed (demo users):

```bash
cd /opt/codexpos/backend && npm run seed
```

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@poshive.store | Admin@123456 |
| Business Owner | owner@demo.poshive.store | Owner@123456 |

Change those immediately after first login.

### 5. DNS

Point these at the server IP. Terminate HTTPS on 443 (Cloudflare, host panel, or another proxy) and forward to Nginx on **8502**. Public URLs have no port.

| Record | Type | Value |
|--------|------|-------|
| `poshive.store` | A | `YOUR_SERVER_IP` |
| `www.poshive.store` | A | `YOUR_SERVER_IP` |
| `app.poshive.store` | A | `YOUR_SERVER_IP` |
| `*.poshive.store` | A | `YOUR_SERVER_IP` |

Browse:

- Marketing: https://poshive.store
- App / POS: https://app.poshive.store
- Tenant storefront: https://{slug}.poshive.store
- Health: https://poshive.store/api/v1/health

### 6. Day-2 commands

```bash
pm2 status
pm2 logs codexpos-api
pm2 logs codexpos-worker
pm2 restart all

# After a git pull
cd /opt/codexpos && ./deploy/scripts/deploy.sh
```

### 7. SSL on a non-80 port

Let's Encrypt HTTP-01 needs port 80. With only 8502–8900 you have two options:

1. **DNS-01** (works without 80/443):

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --manual --preferred-challenges dns \
  -d poshive.store -d '*.poshive.store'
```

Then add `listen 8503 ssl;` (or another free port in range) and the `ssl_certificate` paths in `deploy/nginx/codexpos.conf`.

2. **Front proxy** that already has 80/443 (Cloudflare, another Nginx, or the host panel) and forwards to `http://127.0.0.1:8502`.

### 8. Backups

```bash
mkdir -p /opt/codexpos/backups
0 2 * * * pg_dump -U poshive -h 127.0.0.1 poshive_pos | gzip > /opt/codexpos/backups/poshive_$(date +\%Y\%m\%d).sql.gz
```

### Security checklist

- [ ] Only UFW ports: SSH + **8502** (do not open 8510 / 5432 / 6379)
- [ ] Strong DB password and JWT / upload secrets
- [ ] `PAYMENT_PROVIDER=stripe` (or another real gateway) in production
- [ ] Seed passwords changed
- [ ] Automated Postgres backups

---

## Docker Compose (alternative)

### Prerequisites

- Ubuntu 22.04+ server
- Docker & Docker Compose
- Domain with wildcard DNS (`*.poshive.store`)
- SSL certificate (Let's Encrypt recommended)

### 1. Server Setup

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin -y
```

### 2. Clone & Configure

```bash
git clone <your-repo> /opt/eyz-pos
cd /opt/eyz-pos

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
nano backend/.env
```

**Required production variables:**

- `JWT_ACCESS_SECRET` — 64+ char random string
- `JWT_REFRESH_SECRET` — 64+ char random string
- `DATABASE_URL` — PostgreSQL connection string
- `SMTP_*` — Email configuration
- `S3_*` — Object storage credentials

### 3. DNS Configuration

| Record | Type | Value |
|--------|------|-------|
| poshive.store | A | YOUR_SERVER_IP |
| *.poshive.store | A | YOUR_SERVER_IP |
| app.poshive.store | A | YOUR_SERVER_IP |

**Custom domains (per tenant):**

- CNAME `www.store.com` → `poshive.store`
- TXT `_eyz-verify.store.com` → verification token from admin panel

### 4. Launch Stack

```bash
docker compose up -d

# Verify services (API + BullMQ worker are required for notifications, billing lifecycle, scheduled reports)
docker compose ps
docker compose logs -f api worker
```

**Worker service:** `docker-compose.yml` defines `eyz-worker` (`npm run worker`), which loads `backend/src/workers/index.js` and starts BullMQ consumers plus hourly billing/scheduled-report ticks. Container names still use the legacy `eyz-*` prefix for deploy continuity — do not rename without a migration guide.

### 5. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d poshive.store -d www.poshive.store -d '*.poshive.store'
```

### 6. Database Backups

```bash
# Manual backup
docker exec eyz-postgres pg_dump -U eyz_user eyz_pos > backup_$(date +%Y%m%d).sql

# Scheduled (crontab)
0 2 * * * docker exec eyz-postgres pg_dump -U eyz_user eyz_pos | gzip > /backups/eyz_$(date +\%Y\%m\%d).sql.gz
```

## Scaling

### Horizontal API Scaling

```yaml
# docker-compose.override.yml
services:
  api:
    deploy:
      replicas: 3
```

### PostgreSQL Read Replicas

Configure connection pooling with PgBouncer for 10,000+ tenants.

### Redis Cluster

For high-throughput notification queues, use Redis Cluster or managed Redis.

## Monitoring

- **Health check:** `GET /api/v1/health`
- **PM2 logs:** `pm2 logs`
- **Docker logs:** `docker compose logs -f api worker`
- **Queue status:** Redis CLI `LLEN bull:notifications:wait`

## Local Development

```bash
# Start infrastructure only
docker compose up -d postgres redis

# Backend
cd backend && npm install && cp .env.example .env
npm run migrate && npm run seed && npm run dev

# Frontend
cd frontend && npm install && cp .env.example .env
npm run dev

# Worker (optional for local dev; required in production for queues + scheduled jobs)
cd backend && npm run worker
```

### Printing

- **Browser receipts:** POS uses the browser print dialog (`SaleSuccessDialog` / `window.print`) — no local install required.
- **Queued ESC/POS:** `POST /print/jobs/claim` is for an external print-agent process; the web UI does not drain the queue itself (`HardwareDialog` documents this).

### Auth tokens (local dev)

Access/refresh tokens are stored in `localStorage` on the SPA by default. Logout revokes the refresh token server-side when online.

**Phase A cookie mode:** Set `AUTH_COOKIE_MODE=true` on the API to also issue an `httpOnly` `refresh_token` cookie on login/register (path `/api/v1/auth`). Refresh/logout accept `req.cookies.refresh_token` as a dual-mode fallback alongside `body.refreshToken`. Frontend still stores tokens in `localStorage` until Phase B.

**Reference print agent:** `tools/print-agent/index.js` — polls `POST /print/jobs/claim` with `API_KEY` and `API_URL`.
