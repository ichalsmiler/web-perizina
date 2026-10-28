/**
 * wa-gateway — kirim rekap izin IzinSiswa ke grup WhatsApp (Baileys)
 * ---------------------------------------------------
 * Berjalan sebagai service terpisah di server yang sama dengan aplikasi
 * (dipasang oleh install.sh dengan WA_GATEWAY=1).
 *
 * Yang dikirim: rekap izin 3x pagi hari kerja ke SATU grup WA.
 * Datanya diambil dari aplikasi: GET /api/integrations/wa-rekap
 * (izin yang diajukan hari ini dan sudah disetujui admin).
 * Pengirimnya: nomor WA khusus (bot), BUKAN nomor pribadi utama.
 *
 * PERINGATAN: Baileys itu jalur tidak resmi (pakai protokol WhatsApp Web).
 * Risikonya: nomor bisa kena blokir kalau dipakai spam / volume besar.
 * Untuk volume kecil seperti ini (3 pesan/hari) biasanya aman, tapi tetap
 * pakai nomor khusus, jangan nomor pribadi.
 */
// ESM: Baileys 6.7.24 dipublikasikan sebagai paket ESM ("type": "module").
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// libsignal (enkripsi WhatsApp di dalam Baileys) mencetak isi sesi lewat console,
// termasuk kunci privat, sehingga ikut tersimpan di journal sistem. Pesan-pesan itu
// (dan galat dekripsi rutinnya) dibuang; log gateway sendiri tidak terpengaruh.
const LIBSIGNAL_NOISE = /^(Closing session|Opening session|Removing old closed session|Migrating session|Closing open session|Closing stale open session|Session already (open|closed)|Decrypted message with closed session|Session error|Failed to decrypt message|V1 session storage|WARNING: Expected pubkey|Unhandled bucket type)/;
for (const level of ['log', 'info', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (first, ...rest) => {
    if (typeof first === 'string' && LIBSIGNAL_NOISE.test(first)) return;
    original(first, ...rest);
  };
}

const PORT = process.env.PORT || 3001;
// Hanya dengar di localhost: endpoint /send bisa mengirim pesan WA atas nama bot.
const HOST = process.env.HOST || '127.0.0.1';
const API_KEY = process.env.API_KEY || '';
// Bisa diganti dari halaman /qr tanpa restart; disimpan juga ke .env.
let groupJid = process.env.GROUP_JID || '';
const TIMEZONE = process.env.TIMEZONE || 'Asia/Makassar';
const SEND_IF_EMPTY = String(process.env.SEND_IF_EMPTY || 'false') === 'true';
const IZIN_API_URL = process.env.IZIN_API_URL || '';
const IZIN_API_TOKEN = process.env.IZIN_API_TOKEN || '';
// Jadwal (hari + jam sesi) diatur admin di halaman Pengaturan aplikasi.
const IZIN_JADWAL_URL = process.env.IZIN_JADWAL_URL
  || IZIN_API_URL.replace(/wa-rekap\/?$/, 'wa-jadwal');
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const LAST_SENT_FILE = path.join(__dirname, 'last_sent.json');

const QR_SMALL = String(process.env.QR_SMALL || 'true') !== 'false';

let sock = null;
let connected = false;
let reconnectTimer = null;
let latestQr = null;

// ---------- Koneksi WhatsApp (Baileys) ----------
async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  // WhatsApp menolak versi protokol lama (putus dengan kode 405 sebelum QR muncul).
  // Ambil versi terbaru; bila gagal, pakai bawaan Baileys.
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
    console.log('Versi protokol WhatsApp Web:', version.join('.'));
  } catch (e) {
    console.log('Gagal cek versi WhatsApp Web terbaru, pakai bawaan Baileys:', e.message);
  }
  console.log('Menyambung ke WhatsApp...');
  sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQr = qr;
      console.log('\n=== SCAN QR INI DENGAN NOMOR WA BOT ===');
      // Mode kecil bisa tampil gepeng di sebagian terminal SSH. Mode besar
      // (QR_SMALL=false) butuh ±110 kolom dan memakai kode warna ANSI yang oleh
      // journalctl ditampilkan sebagai "blob data"; halaman /qr lebih andal.
      qrcode.generate(qr, { small: QR_SMALL });
      console.log('WhatsApp > Perangkat Tertaut > Tautkan Perangkat');
      console.log(`Kalau QR di atas sulit di-scan, buka http://127.0.0.1:${PORT}/qr (lihat README)\n`);
    }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode
        : 0;
      console.log('Koneksi WA terputus, kode:', code);
      // Logout (perangkat dilepas dari HP): sesi lama tidak berguna lagi.
      // Hapus lalu sambung ulang supaya QR baru muncul tanpa campur tangan manual.
      if (code === DisconnectReason.loggedOut) {
        console.log('Sesi logout dari HP. Sesi lama dihapus, QR baru akan muncul untuk scan ulang.');
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 2000);
        return;
      }
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    } else if (connection === 'open') {
      connected = true;
      latestQr = null;
      console.log('WhatsApp bot terhubung sebagai:', sock.user?.id);
    }
  });
}

// Tunggu sampai bot terhubung (maks 30 detik), biar kirim tidak gagal diam-diam.
async function waitConnected(timeoutMs = 30000) {
  const start = Date.now();
  while (!connected) {
    if (Date.now() - start > timeoutMs) throw new Error('Bot WA belum terhubung (timeout 30 detik). Cek QR / sesi.');
    await new Promise((r) => setTimeout(r, 500));
  }
}

// ---------- Format pesan rekap ----------
// Format:
//   1. Nama - Kelas - Izinnya
//   2. Nama - Kelas - Izinnya
// Setiap sesi MELANJUTKAN sesi sebelumnya (kumulatif pagi ini):
//   Sesi 07:15: A, B
//   Sesi 07:45: A, B, C, D  (A,B dari sesi sebelumnya + yang baru di range 07:15-07:45)
//   Sesi 08:15: A, B, C, D, E  (lanjut lagi + yang baru di range 07:45-08:15)
// Besok pagi daftarnya mulai dari nol lagi.
function formatRekap(izin, labelPeriode) {
  const tanggal = new Date().toLocaleDateString('id-ID', {
    timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  if (!izin || izin.length === 0) {
    return `📋 *Rekap Izin — ${tanggal}*\n${labelPeriode}\n\nBelum ada izin yang disetujui hari ini.`;
  }
  const baris = izin.map((x, i) => {
    const kelas = x.kelas || '-';
    const izinnya = x.izin || x.jenis || '-';
    return `${i + 1}. ${x.nama} - ${kelas} - ${izinnya}`;
  }).join('\n');
  return `📋 *Rekap Izin — ${tanggal}*\n${labelPeriode}\n\n${baris}\n\nTotal: ${izin.length} izin.`;
}

// Awal hari ini (00:00) dalam timezone Makassar (WITA = UTC+8).
// Dipakai sebagai batas bawah kumulatif: semua izin pagi ini,
// bukan hanya izin sejak kirim terakhir.
function getTodayStartISO() {
  const tgl = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD
  return `${tgl}T00:00:00+08:00`;
}

// Label periode per sesi, kumulatif sejak 00:00 hari ini (sesi bisa siang hari).
// Contoh: "Sesi 07.45 WITA — Daftar izin hari ini s/d 07.45 WITA"
function labelPeriodeSesi() {
  const sesi = new Date().toLocaleTimeString('id-ID', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `Sesi ${sesi} WITA — Daftar izin hari ini s/d ${sesi} WITA`;
}

function setLastSent(iso) {
  fs.writeFileSync(LAST_SENT_FILE, JSON.stringify({ at: iso }, null, 2));
}

// ---------- Ambil data izin ----------
// KUMULATIF PAGI INI: tiap sesi mengambil SEMUA izin hari ini (sejak 00:00).
async function fetchIzin() {
  if (!IZIN_API_URL) {
    // Jangan pernah kirim data contoh ke grup sungguhan.
    throw new Error('IZIN_API_URL belum diisi di .env, rekap tidak dikirim.');
  }
  const since = getTodayStartISO();
  const url = `${IZIN_API_URL}?since=${encodeURIComponent(since)}`;
  let res;
  try {
    res = await fetch(url, {
      headers: IZIN_API_TOKEN ? { Authorization: `Bearer ${IZIN_API_TOKEN}` } : {},
    });
  } catch (e) {
    throw new Error(`Aplikasi IzinSiswa tidak bisa dihubungi di ${IZIN_API_URL} (${e.cause?.code ?? e.message}).`);
  }
  if (!res.ok) throw new Error(`Gagal ambil data izin: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.izin || []);
}

async function kirimRekap() {
  if (!groupJid) throw new Error('Grup tujuan belum dipilih (GROUP_JID kosong).');
  const izin = await fetchIzin();
  if (izin.length === 0 && !SEND_IF_EMPTY) {
    console.log('Tidak ada izin disetujui hari ini, pesan dilewati (SEND_IF_EMPTY=false).');
    setLastSent(new Date().toISOString());
    return { sent: false, count: 0, reason: 'no-new-izin' };
  }
  await waitConnected();
  const pesan = formatRekap(izin, labelPeriodeSesi());
  await sock.sendMessage(groupJid, { text: pesan });
  setLastSent(new Date().toISOString());
  console.log(`Rekap terkirim ke grup: ${izin.length} izin`);
  return { sent: true, count: izin.length };
}

// ---------- API HTTP (localhost saja) ----------
const app = express();
app.use(express.json());

function cekApiKey(req, res, next) {
  if (!API_KEY) {
    return res.status(503).json({ ok: false, error: 'API_KEY belum diisi di .env' });
  }
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'API key salah' });
  }
  next();
}

app.get('/status', (req, res) => {
  res.json({ ok: true, connected, group: groupJid || null, jadwal, timezone: TIMEZONE });
});

// ---------- Halaman pengaturan bot (/qr) ----------
// Tanpa API key: gateway hanya dengar di 127.0.0.1, jadi halaman ini hanya bisa
// dibuka dari server ini atau lewat tunnel SSH, yang sudah butuh login ke server.
// Token formulir mencegah situs lain di browser yang sama mengirim POST ke sini.
const FORM_TOKEN = crypto.randomBytes(16).toString('hex');
const ENV_FILE = path.join(__dirname, '.env');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function saveGroupJid(jid) {
  let txt = '';
  try { txt = fs.readFileSync(ENV_FILE, 'utf8'); } catch { /* .env belum ada */ }
  txt = /^GROUP_JID=.*$/m.test(txt)
    ? txt.replace(/^GROUP_JID=.*$/m, `GROUP_JID=${jid}`)
    : `${txt.replace(/\n?$/, '\n')}GROUP_JID=${jid}\n`;
  fs.writeFileSync(ENV_FILE, txt, { mode: 0o600 });
  groupJid = jid;
}

const PESAN = {
  grup: 'Grup tujuan rekap disimpan.',
  terkirim: 'Rekap terkirim ke grup.',
  kosong: 'Belum ada izin yang diajukan hari ini dan sudah disetujui, jadi tidak ada yang dikirim.',
};

function page(body, refreshSec) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${refreshSec ? `<meta http-equiv="refresh" content="${refreshSec}">` : ''}<title>Bot WhatsApp IzinSiswa</title>
<style>
body{font-family:system-ui,sans-serif;background:#ecf0f1;color:#34495e;margin:0;padding:24px 16px;line-height:1.5}
main{max-width:640px;margin:0 auto}
h1,h2{color:#2c3e50;margin:0 0 8px}h2{font-size:1.1rem;margin-top:24px}
.card{background:#fff;border:1px solid #d5dbdf;border-radius:8px;padding:16px;margin-top:12px}
.qr{text-align:center}.qr img{width:min(360px,90vw);height:auto}
.note{color:#5d6d7e;font-size:.9rem}
.ok{background:#e8f6ee;border:1px solid #1e8449;color:#196f3d;border-radius:4px;padding:10px 12px;margin-top:12px}
.err{background:#fbedeb;border:1px solid #c0392b;color:#c0392b;border-radius:4px;padding:10px 12px;margin-top:12px}
ul{list-style:none;margin:0;padding:0}li{padding:12px 0;border-top:1px solid #d5dbdf}li:first-child{border-top:0}
.name{font-weight:600;color:#2c3e50}.id{font-family:ui-monospace,monospace;font-size:.85rem;word-break:break-all;color:#5d6d7e}
.row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}form{margin:0}
button{min-height:44px;padding:0 14px;border-radius:4px;font:600 .9rem system-ui,sans-serif;cursor:pointer;border:1px solid #7f8c8d;background:#fff;color:#34495e}
button.primary{background:#2c3e50;border-color:#2c3e50;color:#fff}
.tag{display:inline-block;font-size:.8rem;font-weight:600;color:#196f3d;border:1px solid #1e8449;background:#e8f6ee;border-radius:4px;padding:0 6px;margin-left:6px}
:focus-visible{outline:3px solid #3498db;outline-offset:2px}
</style></head>
<body><main>${body}</main>
<script>
document.querySelectorAll('[data-copy]').forEach(function (b) {
  b.addEventListener('click', function () {
    var v = b.getAttribute('data-copy');
    navigator.clipboard.writeText(v).then(function () {
      b.textContent = 'Tersalin';
      setTimeout(function () { b.textContent = 'Salin ID'; }, 2000);
    }, function () { window.prompt('Salin ID grup ini:', v); });
  });
});
</script></body></html>`;
}

app.get('/', (req, res) => res.redirect('/qr'));

// Dipakai setup.js (installer) untuk menggambar QR di terminal.
app.get('/qr.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ connected, qr: connected ? null : latestQr, user: connected ? sock?.user?.id ?? null : null });
});

// Pilih grup tujuan lewat API (dipakai setup.js). Sama dengan tombol di halaman /qr.
app.post('/group', cekApiKey, async (req, res) => {
  try {
    await waitConnected(5000);
    const groups = await sock.groupFetchAllParticipating();
    const jid = String(req.body.jid || '');
    if (!groups[jid]) return res.status(400).json({ ok: false, error: 'Grup tidak ditemukan di daftar grup bot.' });
    saveGroupJid(jid);
    console.log(`Grup tujuan rekap diganti ke ${groups[jid].subject} (${jid})`);
    res.json({ ok: true, group: { id: jid, subject: groups[jid].subject } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/qr', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!connected) {
    if (!latestQr) {
      return res.send(page('<h1>Menunggu QR dari WhatsApp...</h1><p class="note">Halaman memuat ulang sendiri.</p>', 3));
    }
    const png = await QRCode.toDataURL(latestQr, { margin: 2, width: 360 });
    return res.send(page(`<h1>Scan dengan nomor WA bot</h1>
<p>WhatsApp &gt; Perangkat tertaut &gt; Tautkan perangkat</p>
<div class="card qr"><img src="${png}" alt="QR untuk menautkan bot WhatsApp"></div>
<p class="note">QR diganti otomatis tiap beberapa detik; halaman ini ikut memuat ulang.</p>`, 10));
  }

  const pesan = PESAN[req.query.pesan] ? `<p class="ok" role="status">${PESAN[req.query.pesan]}</p>` : '';
  const galat = req.query.galat ? `<p class="err" role="alert">${esc(req.query.galat)}</p>` : '';

  let groups = [];
  let groupError = '';
  try {
    groups = Object.values(await sock.groupFetchAllParticipating())
      .map((g) => ({ id: g.id, subject: g.subject }))
      .sort((a, b) => a.subject.localeCompare(b.subject, 'id'));
  } catch (e) {
    groupError = `<p class="err" role="alert">Daftar grup gagal dimuat: ${esc(e.message)}</p>`;
  }
  const current = groups.find((g) => g.id === groupJid);

  const list = groups.length === 0
    ? '<p class="note">Bot belum menjadi anggota grup mana pun. Masukkan nomor bot ke grup guru, lalu muat ulang halaman ini.</p>'
    : `<ul>${groups.map((g) => `<li>
<div class="name">${esc(g.subject)}${g.id === groupJid ? '<span class="tag">Tujuan rekap</span>' : ''}</div>
<div class="id">${esc(g.id)}</div>
<div class="row">
<button type="button" data-copy="${esc(g.id)}">Salin ID</button>
${g.id === groupJid ? '' : `<form method="post" action="/qr/grup"><input type="hidden" name="token" value="${FORM_TOKEN}">
<input type="hidden" name="jid" value="${esc(g.id)}"><button class="primary" type="submit">Jadikan tujuan rekap</button></form>`}
</div></li>`).join('')}</ul>`;

  const tujuan = groupJid
    ? `<p>Rekap dikirim ke <strong>${esc(current?.subject ?? groupJid)}</strong>.</p>
<form method="post" action="/qr/kirim"><input type="hidden" name="token" value="${FORM_TOKEN}">
<button type="submit">Kirim rekap sekarang (tes)</button></form>`
    : '<p>Grup tujuan belum dipilih. Pilih salah satu grup di bawah.</p>';

  res.send(page(`<h1>Bot WhatsApp terhubung</h1>
<p class="note">Nomor bot: ${esc(sock?.user?.id ?? '')}</p>${pesan}${galat}
<div class="card">${tujuan}</div>
<h2>Grup yang diikuti bot</h2>${groupError}
<div class="card">${list}</div>
<p class="note">Jadwal: ${esc(describeJadwal(jadwal))}. Ubah di aplikasi: Admin &gt; Pengaturan.</p>`));
});

app.post('/qr/grup', express.urlencoded({ extended: false }), async (req, res) => {
  if (req.body.token !== FORM_TOKEN) return res.status(403).send('Token formulir salah. Muat ulang halaman /qr.');
  try {
    await waitConnected(5000);
    const groups = await sock.groupFetchAllParticipating();
    const jid = String(req.body.jid || '');
    if (!groups[jid]) throw new Error('Grup tidak ditemukan di daftar grup bot.');
    saveGroupJid(jid);
    console.log(`Grup tujuan rekap diganti ke ${groups[jid].subject} (${jid})`);
    res.redirect(303, '/qr?pesan=grup');
  } catch (e) {
    res.redirect(303, `/qr?galat=${encodeURIComponent(e.message)}`);
  }
});

app.post('/qr/kirim', express.urlencoded({ extended: false }), async (req, res) => {
  if (req.body.token !== FORM_TOKEN) return res.status(403).send('Token formulir salah. Muat ulang halaman /qr.');
  try {
    const hasil = await kirimRekap();
    res.redirect(303, `/qr?pesan=${hasil.sent ? 'terkirim' : 'kosong'}`);
  } catch (e) {
    res.redirect(303, `/qr?galat=${encodeURIComponent(e.message)}`);
  }
});

// Lihat daftar grup yang diikuti bot, untuk menemukan GROUP_JID yang benar.
app.get('/groups', cekApiKey, async (req, res) => {
  try {
    await waitConnected();
    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups).map((g) => ({ id: g.id, subject: g.subject }));
    res.json({ ok: true, groups: list });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Kirim pesan bebas ke grup (untuk tes koneksi).
app.post('/send', cekApiKey, async (req, res) => {
  try {
    await waitConnected();
    const to = req.body.to || groupJid;
    if (!to || !req.body.message) return res.status(400).json({ ok: false, error: 'to / message wajib diisi' });
    await sock.sendMessage(to, { text: req.body.message });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Kirim rekap sekarang juga (untuk tes di luar jadwal).
app.post('/kirim-rekap', cekApiKey, async (req, res) => {
  try {
    const hasil = await kirimRekap();
    res.json({ ok: true, ...hasil });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---------- Scheduler ----------
// Tiap menit: baca jadwal dari aplikasi, lalu kirim bila hari dan jam (WITA)
// cocok dengan salah satu sesi. Perubahan di halaman Pengaturan berlaku
// paling lambat 1 menit kemudian, tanpa restart.
// SCHEDULER_ENABLED=false di .env mematikan pengiriman terjadwal sepenuhnya.
const SCHEDULER_ENABLED = String(process.env.SCHEDULER_ENABLED || 'true') !== 'false';
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

let jadwal = null; // jadwal terakhir yang berhasil dibaca
let jadwalError = '';
let lastFired = '';

function describeJadwal(j) {
  if (!SCHEDULER_ENABLED) return 'pengiriman terjadwal dimatikan (SCHEDULER_ENABLED=false)';
  if (!j) return 'belum terbaca dari aplikasi';
  if (!j.enabled) return 'rekap otomatis dimatikan di aplikasi';
  const hari = [1, 2, 3, 4, 5, 6, 0].filter((d) => j.days.includes(d)).map((d) => NAMA_HARI[d]).join(', ');
  return `${hari} pukul ${j.times.join(', ')} WITA`;
}

// Hari, tanggal, dan jam sekarang dalam TIMEZONE, format 24 jam.
function nowInZone() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day, date: `${p.year}-${p.month}-${p.day}`, hhmm: `${p.hour}:${p.minute}` };
}

async function fetchJadwal() {
  if (!IZIN_JADWAL_URL) throw new Error('IZIN_API_URL belum diisi di .env');
  const res = await fetch(IZIN_JADWAL_URL, {
    headers: IZIN_API_TOKEN ? { Authorization: `Bearer ${IZIN_API_TOKEN}` } : {},
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (typeof j.enabled !== 'boolean' || !Array.isArray(j.days) || !Array.isArray(j.times)) {
    throw new Error('format jadwal tidak dikenal');
  }
  return j;
}

async function tick() {
  const now = nowInZone(); // dihitung sebelum fetch agar tidak bergeser menit
  try {
    const baru = await fetchJadwal();
    if (JSON.stringify(baru) !== JSON.stringify(jadwal)) console.log('Jadwal rekap:', describeJadwal(baru));
    jadwal = baru;
    jadwalError = '';
  } catch (e) {
    const msg = `Gagal membaca jadwal dari ${IZIN_JADWAL_URL}: ${e.cause?.code ?? e.message}`;
    if (msg !== jadwalError) console.error(`${msg}${jadwal ? ' (memakai jadwal terakhir)' : ''}`);
    jadwalError = msg;
  }
  if (!jadwal?.enabled || !jadwal.days.includes(now.day) || !jadwal.times.includes(now.hhmm)) return;

  const key = `${now.date} ${now.hhmm}`;
  if (key === lastFired) return;
  lastFired = key;
  console.log(`Sesi rekap ${now.hhmm} WITA jalan`);
  try { await kirimRekap(); }
  catch (e) { console.error('Gagal kirim rekap terjadwal:', e.message); }
}

if (SCHEDULER_ENABLED) {
  cron.schedule('* * * * *', tick, { timezone: TIMEZONE });
  tick();
} else {
  console.log('Scheduler dimatikan (SCHEDULER_ENABLED=false). Rekap hanya terkirim lewat tombol tes / POST /kirim-rekap.');
}

if (!API_KEY) console.log('PERINGATAN: API_KEY kosong, endpoint /groups /send /kirim-rekap ditolak.');
if (!groupJid) console.log(`Grup tujuan belum dipilih. Setelah scan QR, pilih grup di http://127.0.0.1:${PORT}/qr`);

app.listen(PORT, HOST, () => console.log(`Gateway jalan di http://${HOST}:${PORT}`));
connect();
