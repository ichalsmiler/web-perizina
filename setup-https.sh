#!/usr/bin/env bash
#
# setup-https.sh — Pasang HTTPS (sertifikat lokal) untuk IzinSiswa.
#
# Kenapa perlu: browser HP hanya mengizinkan kamera (getUserMedia) pada
# "secure context" — yaitu HTTPS atau localhost. Selama aplikasi diakses lewat
# http://<ip-lan>:3000, fitur selfie langsung dari kamera MUSTAHIL berjalan,
# berapa kali pun izin diberikan.
#
# Script ini memasang nginx sebagai reverse proxy TLS di depan Next.js:
#
#   HP orang tua --HTTPS--> nginx :443 --HTTP--> Next.js :3000 (localhost saja)
#
# Sertifikat yang dipakai self-signed (dibuat sendiri, gratis, berlaku 10 tahun)
# karena server hanya diakses di jaringan lokal sekolah — Let's Encrypt tidak
# bisa dipakai tanpa domain publik.
#
# Jalankan: sudo bash setup-https.sh
#
set -euo pipefail

APP_PORT=3000
CERT_DIR=/etc/izinsiswa/tls
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"
NGINX_SITE=/etc/nginx/sites-available/izinsiswa
CERT_DAYS=3650

log()  { echo -e "\n\033[1;36m==>\033[0m $*"; }
ok()   { echo -e "\033[1;32m  ✓\033[0m $*"; }
fail() { echo -e "\033[1;31m  ✗ $*\033[0m" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "Jalankan sebagai root: sudo bash setup-https.sh"

# --- Deteksi IP LAN -----------------------------------------------------------
# Sertifikat harus memuat IP server di kolom SAN, kalau tidak browser menolak
# sertifikat dengan error ERR_CERT_COMMON_NAME_INVALID meski sudah dipercaya.
SERVER_IP="${SERVER_IP:-$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')}"
[[ -n "$SERVER_IP" ]] || fail "IP server tidak terdeteksi. Jalankan ulang dengan: SERVER_IP=172.16.32.209 sudo -E bash setup-https.sh"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo izinsiswa)"

log "Konfigurasi"
echo "  IP server   : $SERVER_IP"
echo "  Hostname    : $HOSTNAME_SHORT"
echo "  Aplikasi    : http://127.0.0.1:$APP_PORT"

# --- 1. nginx -----------------------------------------------------------------
log "Memasang nginx"
if command -v nginx >/dev/null 2>&1; then
  ok "nginx sudah terpasang ($(nginx -v 2>&1 | sed 's|nginx version: ||'))"
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq nginx >/dev/null
  ok "nginx terpasang"
fi

# --- 2. Sertifikat ------------------------------------------------------------
log "Menyiapkan sertifikat TLS"
mkdir -p "$CERT_DIR"

REGENERATE=yes
if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
  # Hanya pakai ulang bila sertifikat masih berlaku >30 hari DAN memuat IP saat ini.
  if openssl x509 -in "$CERT_FILE" -checkend 2592000 -noout >/dev/null 2>&1 \
     && openssl x509 -in "$CERT_FILE" -noout -text 2>/dev/null | grep -q "IP Address:$SERVER_IP"; then
    REGENERATE=no
    ok "Sertifikat lama masih berlaku dan cocok dengan IP $SERVER_IP"
  else
    echo "  Sertifikat lama kedaluwarsa atau IP berubah — dibuat ulang."
  fi
fi

if [[ "$REGENERATE" == yes ]]; then
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$KEY_FILE" -out "$CERT_FILE" -days "$CERT_DAYS" -sha256 \
    -subj "/C=ID/ST=Sulawesi Selatan/L=Makassar/O=IzinSiswa/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP,IP:127.0.0.1,DNS:localhost,DNS:$HOSTNAME_SHORT" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,digitalSignature,keyCertSign" \
    -addext "extendedKeyUsage=serverAuth" \
    >/dev/null 2>&1 || fail "Pembuatan sertifikat gagal"
  chmod 600 "$KEY_FILE"
  chmod 644 "$CERT_FILE"
  ok "Sertifikat dibuat (berlaku $((CERT_DAYS/365)) tahun)"
fi

# --- 3. Konfigurasi nginx -----------------------------------------------------
log "Mengatur nginx sebagai reverse proxy"
cat > "$NGINX_SITE" <<NGINXCONF
# IzinSiswa — TLS reverse proxy.
# Dibuat otomatis oleh setup-https.sh. Perubahan manual akan ditimpa.

server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Orang tua sering mengetik alamat tanpa https:// — alihkan otomatis
    # supaya kamera (yang butuh secure context) selalu bisa dipakai.
    return 301 https://\$host\$request_uri;
}

server {
    # Sintaks "listen 443 ssl http2" dipakai karena nginx di Ubuntu 22.04 (1.18)
    # belum mengenal direktif "http2 on;" yang baru ada sejak nginx 1.25.
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name _;

    ssl_certificate     $CERT_FILE;
    ssl_certificate_key $KEY_FILE;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    # Unggahan dokumen dibatasi 5MB di aplikasi; beri kelonggaran untuk
    # overhead multipart agar nginx tidak menolak duluan dengan 413.
    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;

        # WAJIB: tanpa X-Forwarded-Proto, aplikasi mengira koneksi HTTP biasa
        # dan cookie sesi admin dikirim tanpa flag Secure.
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header Host              \$host;

        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300s;
        proxy_buffering off;
    }
}
NGINXCONF

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/izinsiswa
rm -f /etc/nginx/sites-enabled/default

nginx -t >/dev/null 2>&1 || { nginx -t; fail "Konfigurasi nginx tidak valid"; }
ok "Konfigurasi nginx valid"

systemctl enable nginx >/dev/null 2>&1
systemctl restart nginx
ok "nginx aktif"

# --- 4. Kunci aplikasi agar hanya bisa diakses lewat nginx --------------------
# Tanpa ini Next.js tetap mendengarkan di 0.0.0.0:3000, sehingga siapa pun di
# jaringan masih bisa membuka http://<ip>:3000 dan melewati HTTPS — kamera akan
# gagal lagi dan cookie sesi admin terkirim tanpa enkripsi.
log "Mengunci aplikasi ke localhost"
SERVICE_FILE=/etc/systemd/system/izinsiswa.service
if [[ -f "$SERVICE_FILE" ]]; then
  CHANGED=no

  # Next.js 16 mengabaikan variabel HOSTNAME — hostname harus lewat flag -H.
  if ! grep -qE '^ExecStart=.* -H 127\.0\.0\.1' "$SERVICE_FILE"; then
    sed -i -E 's|^(ExecStart=.*next start)(.*)$|\1 -H 127.0.0.1|' "$SERVICE_FILE"
    CHANGED=yes
  fi
  # Variabel lama dibersihkan agar tidak menyesatkan saat dibaca orang lain.
  if grep -q "Environment=HOSTNAME=" "$SERVICE_FILE"; then
    sed -i '/Environment=HOSTNAME=/d' "$SERVICE_FILE"
    CHANGED=yes
  fi

  if [[ "$CHANGED" == yes ]]; then
    systemctl daemon-reload
    systemctl restart izinsiswa
    sleep 5
  fi
  ok "Aplikasi hanya mendengarkan di 127.0.0.1:$APP_PORT"
else
  echo "  ! File service tidak ditemukan — lewati penguncian"
fi

# --- 5. Firewall --------------------------------------------------------------
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  log "Membuka port di firewall"
  ufw allow 80/tcp  >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ok "Port 80 dan 443 dibuka"
fi

# --- 6. Verifikasi ------------------------------------------------------------
log "Memverifikasi"

systemctl is-active --quiet izinsiswa || fail "Service izinsiswa tidak berjalan. Cek: journalctl -u izinsiswa -n 50"
ok "Service izinsiswa berjalan"

HTTPS_CODE=""
for i in $(seq 1 10); do
  HTTPS_CODE="$(curl -sk -o /dev/null -w '%{http_code}' "https://$SERVER_IP/" 2>/dev/null || echo 000)"
  [[ "$HTTPS_CODE" == "200" ]] && break
  sleep 1
done
[[ "$HTTPS_CODE" == "200" ]] || fail "HTTPS belum menjawab (kode: $HTTPS_CODE)"
ok "HTTPS menjawab 200"

REDIR="$(curl -s -o /dev/null -w '%{http_code}' "http://$SERVER_IP/" 2>/dev/null || echo 000)"
[[ "$REDIR" == "301" ]] && ok "HTTP dialihkan otomatis ke HTTPS" || echo "  ! HTTP tidak mengalihkan (kode: $REDIR)"

PROTO="$(curl -sk "https://$SERVER_IP/api/students/search?query=zzz" -o /dev/null -w '%{http_code}' 2>/dev/null || echo 000)"
[[ "$PROTO" =~ ^(200|400|404)$ ]] && ok "API terjangkau lewat HTTPS" || echo "  ! API menjawab $PROTO"

# Port aplikasi harus tertutup dari jaringan, kalau tidak HTTPS bisa dilewati.
if curl -s --max-time 3 -o /dev/null "http://$SERVER_IP:$APP_PORT/" 2>/dev/null; then
  echo "  ! PERINGATAN: http://$SERVER_IP:$APP_PORT masih terbuka — HTTPS bisa dilewati"
else
  ok "Port $APP_PORT tertutup dari jaringan (hanya lewat nginx)"
fi

FINGERPRINT="$(openssl x509 -in "$CERT_FILE" -noout -fingerprint -sha256 2>/dev/null | cut -d= -f2)"

cat <<SELESAI

────────────────────────────────────────────────────────────
  HTTPS AKTIF
────────────────────────────────────────────────────────────

  Alamat baru : https://$SERVER_IP
  Admin       : https://$SERVER_IP/admin/login
  Lacak izin  : https://$SERVER_IP/lacak

  Sertifikat  : $CERT_FILE
  Sidik jari  : $FINGERPRINT

  CATATAN PENTING untuk orang tua siswa:
  Saat pertama membuka, browser menampilkan peringatan
  "Koneksi tidak aman" / "Your connection is not private".
  Ini normal untuk sertifikat buatan sendiri di jaringan sekolah.

    Chrome / Edge : Lanjutan  ->  Lanjutkan ke $SERVER_IP (tidak aman)
    Firefox       : Lanjutan  ->  Terima Risiko dan Lanjutkan
    Safari (iOS)  : Perincian ->  kunjungi situs web ini

  Setelah itu kamera selfie berfungsi normal dan peringatan
  tidak muncul lagi di perangkat tersebut.

────────────────────────────────────────────────────────────
SELESAI
