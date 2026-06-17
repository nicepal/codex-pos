# EYZ POS Deployment Guide

## Prerequisites

- Ubuntu 22.04+ server
- Docker & Docker Compose
- Domain with wildcard DNS (`*.poshive.store`)
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
| poshive.store | A | YOUR_SERVER_IP |
| *.poshive.store | A | YOUR_SERVER_IP |
| api.poshive.store | A | YOUR_SERVER_IP |

**Custom domains (per tenant):**
- CNAME `www.store.com` → `poshive.store`
- TXT `_eyz-verify.store.com` → verification token from admin panel

### 4. Launch Stack

```bash
docker compose up -d

# Verify services
docker compose ps
docker compose logs -f api
```

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

# Worker (optional)
cd backend && npm run worker
```
