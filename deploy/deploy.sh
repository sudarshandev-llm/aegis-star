#!/usr/bin/env bash
# Build AEGIS from source and restart it on the Hack Club Nest container.
#
# Usage (on the server):
#   ./deploy/deploy.sh
#
# The app must already be checked out at /root/aegis-star and have a .env file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "error: $ROOT/.env is missing. Copy .env.example to .env and configure it first." >&2
  exit 1
fi

echo "[1/4] Installing client dependencies"
npm --prefix client ci --no-audit --no-fund

echo "[2/4] Building the client"
npm --prefix client run build

echo "[3/4] Installing server dependencies"
npm --prefix server ci --no-audit --no-fund

echo "[4/4] Restarting aegis-star.service"
systemctl restart aegis-star.service
systemctl --no-pager --lines=8 status aegis-star.service || true

echo "Deployed. Health check:"
curl -fsS http://127.0.0.1/api/health
echo
