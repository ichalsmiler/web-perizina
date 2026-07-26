#!/usr/bin/env bash
# Installs and starts IzinSiswa as a systemd service on Ubuntu.
#
# Usage:
#   1. Clone the repo on the Ubuntu machine first, e.g.:
#        git clone git@github.com:<you>/izinsiswa.git
#        cd izinsiswa
#   2. Run this script from the repo root:
#        sudo bash deploy/install-ubuntu.sh
#
# Re-running this script is safe (idempotent): it will pull dependencies,
# re-run migrations, and restart the service.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo bash deploy/install-ubuntu.sh)." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$REPO_DIR/web"
SERVICE_USER="izinsiswa"
SERVICE_NAME="izinsiswa"

if [[ ! -d "$WEB_DIR" ]]; then
  echo "Could not find web/ next to this script. Run this from inside the cloned repo." >&2
  exit 1
fi

echo "==> Installing base packages"
apt-get update -y
apt-get install -y curl git build-essential ca-certificates

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]]; then
  echo "==> Installing Node.js 22.x (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "==> Node.js already installed: $(node -v)"
fi

echo "==> Ensuring service user '$SERVICE_USER' exists"
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$SERVICE_USER"
fi

echo "==> Setting up environment file"
if [[ ! -f "$WEB_DIR/.env" ]]; then
  cp "$WEB_DIR/.env.example" "$WEB_DIR/.env"
  GENERATED_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")"
  # Portable in-place edit without relying on GNU sed extensions.
  awk -v secret="$GENERATED_SECRET" '
    /^JWT_SECRET=/ { print "JWT_SECRET=" secret; next }
    { print }
  ' "$WEB_DIR/.env" > "$WEB_DIR/.env.tmp" && mv "$WEB_DIR/.env.tmp" "$WEB_DIR/.env"
  echo "    Generated a random JWT_SECRET in web/.env"
else
  echo "    web/.env already exists, leaving it untouched"
fi

echo "==> Installing dependencies"
cd "$WEB_DIR"
npm ci

echo "==> Applying database migrations"
npx prisma migrate deploy
npx prisma generate

echo "==> Seeding default admin + sample students (safe to re-run)"
npm run seed

echo "==> Building production bundle"
npm run build

echo "==> Fixing file ownership"
chown -R "$SERVICE_USER:$SERVICE_USER" "$REPO_DIR"

echo "==> Installing systemd service"
sed \
  -e "s#/opt/izinsiswa/web#$WEB_DIR#g" \
  -e "s/^User=.*/User=$SERVICE_USER/" \
  -e "s/^Group=.*/Group=$SERVICE_USER/" \
  "$REPO_DIR/deploy/izinsiswa.service" > "/etc/systemd/system/${SERVICE_NAME}.service"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo
echo "==> Done. Checking status:"
systemctl --no-pager status "$SERVICE_NAME" || true
echo
IP_ADDR="$(hostname -I | awk '{print $1}')"
echo "IzinSiswa should now be reachable at: http://${IP_ADDR}:3000"
echo "Admin login: admin@izinsiswa.sch.id / admin123 (change this password!)"
echo
echo "Useful commands:"
echo "  sudo systemctl status $SERVICE_NAME"
echo "  sudo systemctl restart $SERVICE_NAME"
echo "  sudo journalctl -u $SERVICE_NAME -f"
