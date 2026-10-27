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
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const PORT = process.env.PORT || 3001;
// Hanya dengar di localhost: endpoint /send bisa mengirim pesan WA atas nama bot.
const HOST = process.env.HOST || '127.0.0.1';
const API_KEY = process.env.API_KEY || '';
const GROUP_JID = process.env.GROUP_JID || '';
// 3 sesi, jeda 30 menit, Senin-Jumat: 07:15, 07:45, 08:15.
// Satu ekspresi cron tidak bisa mewakili ketiganya sekaligus, jadi
// CRON_SCHEDULE boleh berisi beberapa ekspresi yang dipisah ';'.
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '15 7 * * 1-5;45 7 * * 1-5;15 8 * * 1-5';
const TIMEZONE = process.env.TIMEZONE || 'Asia/Makassar';
const SEND_IF_EMPTY = String(process.env.SEND_IF_EMPTY || 'false') === 'true';
const IZIN_API_URL = process.env.IZIN_API_URL || '';
const IZIN_API_TOKEN = process.env.IZIN_API_TOKEN || '';
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const LAST_SENT_FILE = path.join(__dirname, 'last_sent.json');

let sock = null;
let connected = false;
let reconnectTimer = null;

// ---------- Koneksi WhatsApp (Baileys) ----------
async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n=== SCAN QR INI DENGAN NOMOR WA BOT ===');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp > Perangkat Tertaut > Tautkan Perangkat\n');
    }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode
        : 0;
      console.log('Koneksi WA terputus, kode:', code);
      // Kalau logout (bukan sekadar putus), minta scan ulang, jangan loop.
      if (code === DisconnectReason.loggedOut) {
        console.log(`Sesi logout. Hapus folder ${AUTH_DIR}, lalu restart service dan scan QR lagi.`);
        return;
      }
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    } else if (connection === 'open') {
      connected = true;
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

// Label periode per sesi, kumulatif pagi ini.
// Contoh: "Sesi 07:45 WITA — Daftar izin pagi ini s/d 07:45 WITA"
function labelPeriodeSesi() {
  const sesi = new Date().toLocaleTimeString('id-ID', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
  return `Sesi ${sesi} WITA — Daftar izin pagi ini s/d ${sesi} WITA`;
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
  const res = await fetch(url, {
    headers: IZIN_API_TOKEN ? { Authorization: `Bearer ${IZIN_API_TOKEN}` } : {},
  });
  if (!res.ok) throw new Error(`Gagal ambil data izin: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.izin || []);
}

async function kirimRekap() {
  if (!GROUP_JID) throw new Error('GROUP_JID belum diisi di .env');
  const izin = await fetchIzin();
  if (izin.length === 0 && !SEND_IF_EMPTY) {
    console.log('Tidak ada izin disetujui hari ini, pesan dilewati (SEND_IF_EMPTY=false).');
    setLastSent(new Date().toISOString());
    return { sent: false, count: 0, reason: 'no-new-izin' };
  }
  await waitConnected();
  const pesan = formatRekap(izin, labelPeriodeSesi());
  await sock.sendMessage(GROUP_JID, { text: pesan });
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
  res.json({ ok: true, connected, group: GROUP_JID || null, cron: CRON_SCHEDULE, timezone: TIMEZONE });
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
    const to = req.body.to || GROUP_JID;
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
// SCHEDULER_ENABLED=false mematikan pengiriman terjadwal (mis. saat masa uji).
const SCHEDULER_ENABLED = String(process.env.SCHEDULER_ENABLED || 'true') !== 'false';
const CRON_LIST = SCHEDULER_ENABLED
  ? CRON_SCHEDULE.split(';').map((s) => s.trim()).filter(Boolean)
  : [];
let schedulerAktif = false;
for (const expr of CRON_LIST) {
  if (!cron.validate(expr)) {
    console.log(`CRON tidak valid, dilewati: ${expr}`);
    continue;
  }
  cron.schedule(expr, async () => {
    console.log('Jadwal rekap jalan:', new Date().toLocaleString('id-ID', { timeZone: TIMEZONE }));
    try { await kirimRekap(); }
    catch (e) { console.error('Gagal kirim rekap terjadwal:', e.message); }
  }, { timezone: TIMEZONE });
  schedulerAktif = true;
}
if (schedulerAktif) {
  console.log(`Scheduler aktif: ${CRON_LIST.join(' | ')} (${TIMEZONE})`);
} else if (!SCHEDULER_ENABLED) {
  console.log('Scheduler dimatikan (SCHEDULER_ENABLED=false). Rekap hanya terkirim lewat POST /kirim-rekap.');
} else {
  console.log('Tidak ada CRON yang valid, scheduler dimatikan. Cek .env.');
}

if (!API_KEY) console.log('PERINGATAN: API_KEY kosong, endpoint /groups /send /kirim-rekap ditolak.');
if (!GROUP_JID) console.log('GROUP_JID belum diisi. Setelah scan QR, cari ID grup lewat GET /groups.');

app.listen(PORT, HOST, () => console.log(`Gateway jalan di http://${HOST}:${PORT}`));
connect();
