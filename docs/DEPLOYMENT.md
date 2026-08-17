# Codex POS Deployment Guide

## Prerequisites

- Ubuntu 22.04+ server
- Docker & Docker Compose
- Domain with wildcard DNS (`*.codexpos.store`)
- SSL certificate (Let's Encrypt recommended)

## Production Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

### 2. Clone & Configure

```bash
git clone <your-repo> /opt/eyz-pos
cd /opt/eyz-pos

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit secrets
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
| codexpos.store | A | YOUR_SERVER_IP |
| *.codexpos.store | A | YOUR_SERVER_IP |
| api.codexpos.store | A | YOUR_SERVER_IP |

**Custom domains (per tenant):**
- CNAME `www.store.com` → `codexpos.store`
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
sudo certbot --nginx -d codexpos.store -d www.codexpos.store -d '*.codexpos.store'
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
- **Logs:** `docker compose logs -f api worker`
- **Queue status:** Redis CLI `LLEN bull:notifications:wait`

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall (UFW): allow 80, 443, 22 only
- [ ] Use strong JWT secrets
- [ ] Enable PostgreSQL SSL
- [ ] Configure rate limiting
- [ ] Set up automated backups
- [ ] Enable audit log retention policy

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
