#!/usr/bin/env bash
# One-time Ubuntu setup for PosHive (PM2 + Nginx).
# Run as a sudo-capable user. Does not overwrite existing .env files.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
WWW_DIR="${WWW_DIR:-/var/www/codexpos}"
NODE_MAJOR="${NODE_MAJOR:-20}"
NGINX_PORT="${NGINX_PORT:-8502}"
API_PORT="${API_PORT:-8510}"
DEPLOY_USER="${DEPLOY_USER:-$USER}"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this script as a sudo user, not as root."
  exit 1
fi

echo "==> Installing system packages"
sudo apt-get update
sudo apt-get install -y curl ca-certificates gnupg lsb-release build-essential \
  rsync nginx postgresql postgresql-contrib redis-server

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt "${NODE_MAJOR}" ]]; then
  echo "==> Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo npm install -g pm2

echo "==> Enabling Redis and PostgreSQL"
sudo systemctl enable --now redis-server
sudo systemctl enable --now postgresql

echo "==> Creating app and web directories"
sudo mkdir -p "${APP_DIR}" "${WWW_DIR}/frontend" "${WWW_DIR}/website"
sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}" "${WWW_DIR}"

if [[ ! -d "${APP_DIR}/backend" ]]; then
  echo "Copy or clone the repo into ${APP_DIR} before running deploy.sh"
fi

echo "==> Opening assigned public port ${NGINX_PORT} (range 8502-8900)"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH
  sudo ufw allow "${NGINX_PORT}/tcp"
  echo "Do not allow ${API_PORT} on the firewall. Nginx proxies to 127.0.0.1:${API_PORT}."
  sudo ufw --force enable || true
fi

echo
echo "Next steps:"
echo "  1. Place the repo at ${APP_DIR} (git clone or rsync)"
echo "  2. Create Postgres role/database (see docs/DEPLOYMENT.md)"
echo "  3. Copy deploy/env/*.production.example to the app .env files and edit secrets"
echo "  4. Run: ${APP_DIR}/deploy/scripts/deploy.sh"
echo
echo "Node $(node -v)  npm $(npm -v)  pm2 $(pm2 -v)"
