#!/usr/bin/env bash
# ============================================================
#  IzinSiswa — One-Command Installer untuk Ubuntu Server
# ============================================================
#
#  Jalankan di Ubuntu 22.04 / 24.04 dengan satu perintah:
#
#    curl -sL https://raw.githubusercontent.com/ichalsmiler/web-perizina/main/install.sh | sudo bash
#
#  Atau kalau sudah clone repo:
#
#    sudo bash install.sh
#
#  Apa yang dilakukan script ini:
#    1. Install Node.js 22.x (kalau belum ada)
#    2. Clone repo (kalau belum ada)
#    3. Install dependencies + build
#    4. Setup database (SQLite) + seed admin
#    5. Pasang sebagai systemd service (auto-start saat boot)
#    6. (Opsional) Pasang Cloudflare Tunnel untuk akses publik
#
#  Re-run script ini aman (idempotent) — update, rebuild, restart.
# ============================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "Jalankan sebagai root: sudo bash install.sh"
  exit 1
fi

INSTALL_DIR="/opt/izinsiswa"
SERVICE_USER="izinsiswa"
SERVICE_NAME="izinsiswa"
REPO_URL="https://github.com/ichalsmiler/web-perizina.git"
PORT=3000

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   IzinSiswa — Installer Otomatis          ║${NC}"
echo -e "${CYAN}║   Aplikasi Perizinan Digital Siswa         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# --- 1. Paket dasar ---
log "Menginstall paket dasar..."
apt-get update -qq -y
apt-get install -qq -y curl git build-essential ca-certificates >/dev/null 2>&1

# --- 2. Node.js 22.x (WAJIB system-wide agar bisa diakses service user) ---
NODE_BIN=""
if [[ -x /usr/bin/node ]]; then
  NODE_MAJOR=$(/usr/bin/node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 20 ]]; then
    NODE_BIN=/usr/bin/node
    log "Node.js system sudah terinstall: $(/usr/bin/node -v)"
  fi
fi

if [[ -z "$NODE_BIN" ]]; then
  log "Menginstall Node.js 22.x (system-wide)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -qq -y nodejs >/dev/null 2>&1
  NODE_BIN=/usr/bin/node
  log "Node.js terinstall: $(/usr/bin/node -v)"
fi

# Pastikan npm tersedia
if ! command -v npm >/dev/null 2>&1; then
  err "npm tidak ditemukan setelah instalasi Node.js"
  exit 1
fi

# --- 3. Clone / update repo ---
if [[ -d "$INSTALL_DIR/.git" ]]; then
  log "Repo sudah ada di $INSTALL_DIR, mengupdate..."
  cd "$INSTALL_DIR"
  git pull --ff-only 2>/dev/null || git pull --rebase 2>/dev/null || true
else
  # Kalau script dijalankan dari dalam repo, copy ke /opt
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "$SCRIPT_DIR/web/package.json" ]]; then
    log "Menyalin repo ke $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
    cp -a "$SCRIPT_DIR"/. "$INSTALL_DIR"/
  else
    log "Mengclone repo ke $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
fi

WEB_DIR="$INSTALL_DIR/web"
cd "$WEB_DIR"

# --- 4. User service ---
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  log "User '$SERVICE_USER' dibuat"
else
  log "User '$SERVICE_USER' sudah ada"
fi

# --- 5. Environment ---
if [[ ! -f "$WEB_DIR/.env" ]]; then
  JWT=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
  cat > "$WEB_DIR/.env" <<ENVEOF
DATABASE_URL=file:./dev.db
JWT_SECRET=$JWT
ENVEOF
  log ".env dibuat dengan JWT_SECRET acak"
else
  log ".env sudah ada, tidak diubah"
fi

# --- 6. Install dependencies ---
log "Menginstall dependencies (npm ci)..."
npm ci --loglevel=error 2>&1 | tail -3

# --- 7. Database ---
log "Menjalankan migrasi database..."
npx prisma migrate deploy 2>&1 | tail -3
npx prisma generate 2>&1 | tail -1

log "Seeding data awal (admin + contoh siswa)..."
npm run seed 2>&1 | tail -2

# --- 8. Build ---
log "Building production bundle..."
npm run build 2>&1 | tail -5

# --- 9. Ownership ---
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
log "Ownership diatur ke $SERVICE_USER"

# --- 10. Systemd service ---
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SVCEOF
[Unit]
Description=IzinSiswa — Aplikasi Perizinan Digital Siswa
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$WEB_DIR
EnvironmentFile=$WEB_DIR/.env
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/node $WEB_DIR/node_modules/.bin/next start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null 2>&1
systemctl restart "$SERVICE_NAME"
log "Service '$SERVICE_NAME' diinstall dan dijalankan"

# Tunggu aplikasi siap (maks 30 detik)
log "Menunggu aplikasi siap..."
READY=0
for i in $(seq 1 15); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 5 "http://127.0.0.1:$PORT/" 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" ]]; then
    READY=1
    log "Aplikasi berjalan dan merespons (HTTP 200)"
    break
  fi
  sleep 2
done

if [[ "$READY" -ne 1 ]]; then
  err "Aplikasi TIDAK merespons setelah 30 detik."
  err "Cek log dengan: sudo journalctl -u $SERVICE_NAME -n 50 --no-pager"
  systemctl --no-pager status "$SERVICE_NAME" 2>&1 | head -15
  exit 1
fi

# --- Selesai ---
IP_ADDR=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ${GREEN}Instalasi selesai!${CYAN}                                   ║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}                                                       ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Aplikasi : http://${IP_ADDR}:${PORT}                ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Admin    : http://${IP_ADDR}:${PORT}/admin/login    ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                       ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Login admin:                                         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    Email    : admin@izinsiswa.sch.id                   ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    Password : admin123 ${RED}(SEGERA GANTI!)${NC}                 ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                       ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Perintah berguna:                                    ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    sudo systemctl status izinsiswa                    ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    sudo systemctl restart izinsiswa                   ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    sudo journalctl -u izinsiswa -f                    ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                       ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Update: cd /opt/izinsiswa && git pull                ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}          sudo bash install.sh                         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                       ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
