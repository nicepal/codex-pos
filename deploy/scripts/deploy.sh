#!/usr/bin/env bash
# Build static apps and (re)start PM2 processes.
# Usage: APP_DIR=/opt/codexpos ./deploy/scripts/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
WWW_DIR="${WWW_DIR:-/var/www/codexpos}"
NGINX_CONF_SRC="${APP_DIR}/deploy/nginx/codexpos.conf"
NGINX_CONF_DEST="${NGINX_CONF_DEST:-/etc/nginx/sites-available/codexpos}"

cd "${APP_DIR}"

copy_env_if_missing() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "${dest}" ]]; then
    cp "${src}" "${dest}"
    echo "Created ${dest} — edit secrets before going live."
  fi
}

copy_env_if_missing "${APP_DIR}/deploy/env/backend.production.example" "${APP_DIR}/backend/.env"
copy_env_if_missing "${APP_DIR}/deploy/env/frontend.production.example" "${APP_DIR}/frontend/.env.production"
copy_env_if_missing "${APP_DIR}/deploy/env/website.production.example" "${APP_DIR}/main-website/.env.production"

echo "==> Installing backend dependencies"
(cd "${APP_DIR}/backend" && npm ci --omit=dev)

echo "==> Running database migrations"
(cd "${APP_DIR}/backend" && npm run migrate)

echo "==> Building frontend"
(cd "${APP_DIR}/frontend" && npm ci && npm run build)
mkdir -p "${WWW_DIR}/frontend"
rsync -a --delete "${APP_DIR}/frontend/dist/" "${WWW_DIR}/frontend/"

echo "==> Building marketing website"
(cd "${APP_DIR}/main-website" && npm ci && npm run build)
mkdir -p "${WWW_DIR}/website"
rsync -a --delete "${APP_DIR}/main-website/dist/" "${WWW_DIR}/website/"

echo "==> Starting PM2 apps"
mkdir -p "${HOME}/.pm2"
pm2 start "${APP_DIR}/deploy/ecosystem.config.cjs" --env production
pm2 save
if command -v sudo >/dev/null 2>&1; then
  sudo env PATH="${PATH}" pm2 startup systemd -u "$(whoami)" --hp "${HOME}" >/tmp/codexpos-pm2-startup.txt || true
  echo "If this is the first deploy, review /tmp/codexpos-pm2-startup.txt and run the printed systemd command."
fi

if [[ -f "${NGINX_CONF_SRC}" ]] && [[ -w "$(dirname "${NGINX_CONF_DEST}")" || "$(id -u)" -eq 0 ]]; then
  echo "==> Installing Nginx site"
  sudo cp "${NGINX_CONF_SRC}" "${NGINX_CONF_DEST}"
  sudo ln -sfn "${NGINX_CONF_DEST}" /etc/nginx/sites-enabled/codexpos
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    sudo rm -f /etc/nginx/sites-enabled/default
  fi
  sudo nginx -t
  sudo systemctl reload nginx
else
  echo "Skip Nginx install (need sudo). Copy ${NGINX_CONF_SRC} to ${NGINX_CONF_DEST} manually."
fi

echo
echo "Health check (local API):"
curl -fsS "http://127.0.0.1:8510/api/v1/health" || echo "API not responding yet — check: pm2 logs codexpos-api"
echo
echo "Public entry (Nginx): http://$(hostname -I | awk '{print $1}'):8502"
pm2 status
