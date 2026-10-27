#!/usr/bin/env bash
# ============================================================
#  IzinSiswa: installer satu file untuk Ubuntu 22.04 / 24.04
# ============================================================
#
#  Server baru: salin file ini saja ke server, lalu jalankan
#
#    sudo bash install.sh
#
#  atau langsung dari GitHub:
#
#    curl -fsSL https://raw.githubusercontent.com/ichalsmiler/web-perizina/main/install.sh | sudo bash
#
#  Server lama (update): jalankan perintah yang sama. Script mendeteksi
#  instalasi yang ada, membackup database + file unggahan, menarik kode
#  terbaru, build ulang, lalu restart. .env dan password admin tidak diubah.
#
#  Opsi lewat environment variable (semuanya opsional):
#    ADMIN_USERNAME  username admin saat pasang baru (default: admin)
#    ADMIN_PASSWORD  password admin; saat update, isi hanya bila ingin mengganti
#    INSTALL_DIR     lokasi aplikasi (default: /opt/izinsiswa)
#    BRANCH          branch GitHub (default: main)
#    PORT            port aplikasi (default: 3000)
#    BIND_HOST       alamat dengar (default: tetap seperti sebelumnya, atau
#                    0.0.0.0 untuk pasang baru; setup-https.sh memakai 127.0.0.1)
#    FORCE_RESET=1   buang perubahan manual pada file kode di server saat update
#                    (database, .env, dan file unggahan tidak tersentuh)
#
#  Contoh: sudo ADMIN_USERNAME=smada ADMIN_PASSWORD='rahasia-kuat' bash install.sh
# ============================================================

set -euo pipefail

REPO_URL="https://github.com/ichalsmiler/web-perizina.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/izinsiswa}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3000}"
SERVICE_USER="izinsiswa"
SERVICE_NAME="izinsiswa"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
BACKUP_DIR="/var/backups/izinsiswa"
WEB_DIR="$INSTALL_DIR/web"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "\n${CYAN}==>${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[gagal]${NC} $*" >&2; exit 1; }

# Repo dimiliki user service; git menolak repo milik user lain kecuali ditandai aman.
g() { git -c safe.directory="$INSTALL_DIR" -C "$INSTALL_DIR" "$@"; }

[[ $EUID -eq 0 ]] || die "Jalankan sebagai root: sudo bash install.sh"

# Bash membaca script sedikit demi sedikit. Kalau file ini ada di dalam repo yang
# akan di-update, git bisa menimpanya di tengah jalan; jalankan salinannya saja.
SELF="${BASH_SOURCE[0]:-}"
if [[ -z "${IZS_REEXEC:-}" && -f "$SELF" && "$(realpath "$SELF")" == "$(realpath -m "$INSTALL_DIR")"/* ]]; then
  TMP_SELF="$(mktemp /tmp/izinsiswa-install.XXXXXX.sh)"
  cp "$SELF" "$TMP_SELF"
  IZS_REEXEC=1 exec bash "$TMP_SELF" "$@"
fi
command -v apt-get >/dev/null 2>&1 || die "Script ini untuk Ubuntu/Debian (apt-get tidak ditemukan)."

if [[ -d "$INSTALL_DIR/.git" ]]; then
  MODE="update"
elif [[ -e "$INSTALL_DIR" && -n "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]]; then
  die "$INSTALL_DIR sudah ada tetapi bukan repo git. Pindahkan dulu, atau pakai INSTALL_DIR lain."
else
  MODE="baru"
fi

echo -e "${CYAN}IzinSiswa installer${NC} (mode: $MODE, lokasi: $INSTALL_DIR)"

# --- 1. Paket dasar dan Node.js ---------------------------------------------
step "Memasang paket dasar"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -qq -y curl git build-essential ca-certificates >/dev/null
ok "curl, git, build-essential"

NODE_MAJOR=0
if [[ -x /usr/bin/node ]]; then
  NODE_MAJOR=$(/usr/bin/node -v | sed 's/^v//' | cut -d. -f1)
fi
if (( NODE_MAJOR < 20 )); then
  step "Memasang Node.js 22.x"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -qq -y nodejs >/dev/null
fi
ok "Node.js $(/usr/bin/node -v), npm $(npm -v)"

# --- 2. User service ---------------------------------------------------------
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  ok "User $SERVICE_USER dibuat"
fi

# --- 3. Kode aplikasi --------------------------------------------------------
BACKUP_FILE=""
if [[ "$MODE" == "update" ]]; then
  step "Backup database, file unggahan, dan .env"
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
  ITEMS=()
  for p in web/prisma/dev.db web/storage web/.env; do
    if [[ -e "$INSTALL_DIR/$p" ]]; then ITEMS+=("$p"); fi
  done
  if (( ${#ITEMS[@]} > 0 )); then
    BACKUP_FILE="$BACKUP_DIR/izinsiswa-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" -C "$INSTALL_DIR" "${ITEMS[@]}"
    ok "Backup: $BACKUP_FILE"
    # Simpan 10 backup terakhir saja.
    ls -1t "$BACKUP_DIR"/izinsiswa-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
  else
    warn "Belum ada data untuk dibackup"
  fi

  step "Menarik kode terbaru ($BRANCH)"
  g remote set-url origin "$REPO_URL"
  g fetch --quiet origin "$BRANCH"
  if [[ -n "$(g status --porcelain --untracked-files=no)" ]]; then
    if [[ "${FORCE_RESET:-0}" == "1" ]]; then
      warn "Membuang perubahan manual pada file kode (FORCE_RESET=1)"
      g reset --hard --quiet "origin/$BRANCH"
    else
      g status --short --untracked-files=no
      die "Ada file kode yang diubah manual di server (daftar di atas).
       Update dibatalkan agar perubahan itu tidak hilang diam-diam.
       Untuk membuangnya dan memakai versi GitHub: sudo FORCE_RESET=1 bash install.sh"
    fi
  else
    g checkout --quiet "$BRANCH" 2>/dev/null || g checkout --quiet -b "$BRANCH" "origin/$BRANCH"
    g merge --ff-only --quiet "origin/$BRANCH" \
      || die "Riwayat git di server bercabang dari GitHub. Jalankan dengan FORCE_RESET=1 untuk menyamakan."
  fi
  ok "Kode di versi $(g log -1 --format='%h %s')"
else
  step "Mengunduh aplikasi dari GitHub"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  ok "Kode di versi $(g log -1 --format='%h %s')"
fi

[[ -f "$WEB_DIR/package.json" ]] || die "Folder web/ tidak ditemukan di $INSTALL_DIR."
cd "$WEB_DIR"

# --- 4. Konfigurasi ----------------------------------------------------------
if [[ ! -f .env ]]; then
  JWT=$(/usr/bin/node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
  printf 'DATABASE_URL=file:./dev.db\nJWT_SECRET=%s\n' "$JWT" > .env
  chmod 600 .env
  ok ".env dibuat dengan JWT_SECRET acak"
else
  ok ".env lama dipakai, tidak diubah"
fi

# Pasang baru tanpa ADMIN_PASSWORD: tanyakan di terminal bila ada (juga saat lewat curl | bash).
if [[ "$MODE" == "baru" && -z "${ADMIN_PASSWORD:-}" ]] && { : </dev/tty; } 2>/dev/null; then
  step "Akun admin sekolah"
  read -r -p "Username admin [${ADMIN_USERNAME:-admin}]: " INPUT_USER </dev/tty || true
  ADMIN_USERNAME="${INPUT_USER:-${ADMIN_USERNAME:-admin}}"
  while true; do
    read -r -s -p "Password admin (min. 8 karakter, kosongkan untuk dibuat acak): " P1 </dev/tty || true
    echo
    [[ -z "$P1" ]] && break
    if (( ${#P1} < 8 )); then warn "Terlalu pendek."; continue; fi
    read -r -s -p "Ulangi password: " P2 </dev/tty || true
    echo
    if [[ "$P1" == "$P2" ]]; then ADMIN_PASSWORD="$P1"; break; fi
    warn "Password tidak sama, ulangi."
  done
fi
export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
if [[ -n "${ADMIN_PASSWORD:-}" ]]; then export ADMIN_PASSWORD; else unset ADMIN_PASSWORD; fi

# --- 5. Dependensi, database, build ------------------------------------------
LOG_FILE="$(mktemp /tmp/izinsiswa-install.XXXXXX.log)"
run() {
  local label="$1"; shift
  echo -n "    $label... "
  if "$@" >>"$LOG_FILE" 2>&1; then
    echo "selesai"
  else
    echo "GAGAL"
    tail -n 40 "$LOG_FILE" >&2
    die "$label gagal. Log lengkap: $LOG_FILE${BACKUP_FILE:+
       Data sebelum update ada di: $BACKUP_FILE}"
  fi
}

step "Memasang dependensi, database, dan build"
run "npm ci" npm ci --no-audit --no-fund
run "Migrasi database" npx prisma migrate deploy
run "Prisma client" npx prisma generate

# Output seed ditampilkan utuh: saat password admin dibuat acak, di sinilah ia dicetak.
echo "    Seed admin:"
if ! npm run --silent seed 2>&1 | sed 's/^/      /'; then
  die "Seed gagal (pesan di atas)."
fi

run "Build produksi (beberapa menit)" npm run build
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
ok "Kepemilikan file: $SERVICE_USER"

# --- 6. Service systemd ------------------------------------------------------
if [[ -z "${BIND_HOST:-}" ]]; then
  # Pertahankan alamat dengar lama (mis. 127.0.0.1 dari setup-https.sh).
  BIND_HOST=$(grep -oP '^ExecStart=.*next start.*-H \K[^ ]+' "$SERVICE_FILE" 2>/dev/null || true)
  BIND_HOST="${BIND_HOST:-0.0.0.0}"
fi

step "Memasang service $SERVICE_NAME (dengar di $BIND_HOST:$PORT)"
cat > "$SERVICE_FILE" <<SVCEOF
[Unit]
Description=IzinSiswa (aplikasi perizinan digital siswa)
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$WEB_DIR
EnvironmentFile=$WEB_DIR/.env
Environment=NODE_ENV=production
# Next.js 16 mengabaikan variabel HOSTNAME; alamat dengar harus lewat -H.
ExecStart=/usr/bin/node $WEB_DIR/node_modules/.bin/next start -H $BIND_HOST -p $PORT
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable --quiet "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo -n "    Menunggu aplikasi merespons"
CHECK_HOST="$BIND_HOST"
if [[ "$CHECK_HOST" == "0.0.0.0" ]]; then CHECK_HOST="127.0.0.1"; fi
for _ in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 3 "http://$CHECK_HOST:$PORT/" || true)
  [[ "$CODE" == "200" ]] && break
  echo -n "."
  sleep 2
done
echo
if [[ "$CODE" != "200" ]]; then
  journalctl -u "$SERVICE_NAME" -n 30 --no-pager >&2 || true
  die "Aplikasi tidak merespons setelah 60 detik (log di atas).${BACKUP_FILE:+
       Data sebelum update ada di: $BACKUP_FILE}"
fi
ok "Aplikasi berjalan (HTTP 200)"
rm -f "$LOG_FILE"

# --- Selesai -----------------------------------------------------------------
IP_ADDR=$(hostname -I | awk '{print $1}')
echo
echo -e "${GREEN}Selesai ($MODE).${NC}"
if [[ "$BIND_HOST" == "127.0.0.1" ]]; then
  echo "  Aplikasi hanya dengar di localhost; akses lewat nginx: https://$IP_ADDR"
else
  echo "  Orang tua : http://$IP_ADDR:$PORT"
  echo "  Admin     : http://$IP_ADDR:$PORT/admin/login"
fi
if [[ "$MODE" == "baru" ]]; then
  echo "  Username admin: $ADMIN_USERNAME"
  if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
    echo "  Password admin: lihat baris 'Admin dibuat' di bagian Seed admin di atas, catat sekarang."
  fi
fi
if [[ -n "$BACKUP_FILE" ]]; then echo "  Backup sebelum update: $BACKUP_FILE"; fi
echo
echo "  Update berikutnya : sudo bash $INSTALL_DIR/install.sh"
echo "  Status / log      : sudo systemctl status $SERVICE_NAME  |  sudo journalctl -u $SERVICE_NAME -f"
