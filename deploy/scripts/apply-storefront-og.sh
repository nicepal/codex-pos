#!/usr/bin/env bash
# Apply storefront Open Graph support (API + Nginx bot routing).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NGINX_SRC="$ROOT/deploy/nginx/codexpos.conf"
NGINX_DST="${NGINX_DST:-/etc/nginx/sites-available/codexpos}"

echo "==> Restart API (OG routes)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart codexpos-api --update-env || pm2 restart all
else
  echo "pm2 not found — restart your Node API manually"
fi

echo "==> Install nginx config"
if [[ -f "$NGINX_SRC" ]]; then
  if [[ -w "$(dirname "$NGINX_DST")" ]] || [[ "$(id -u)" -eq 0 ]]; then
    cp "$NGINX_SRC" "$NGINX_DST"
  else
    sudo cp "$NGINX_SRC" "$NGINX_DST"
  fi
  if command -v nginx >/dev/null 2>&1; then
    sudo nginx -t
    sudo systemctl reload nginx
  fi
  echo "Nginx reloaded from $NGINX_SRC → $NGINX_DST"
else
  echo "Missing $NGINX_SRC"
  exit 1
fi

echo "==> Smoke test"
sleep 1
curl -fsS "http://127.0.0.1:8510/api/v1/storefront/og/codexhive" | head -c 200 || true
echo
curl -fsS -A "facebookexternalhit/1.1" "http://127.0.0.1:8502/store/codexhive" | head -c 200 || true
echo
echo "Done. Then scrape https://app.poshive.store/store/codexhive in Facebook Sharing Debugger."
