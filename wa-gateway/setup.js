/**
 * Setup bot WhatsApp di terminal: tampilkan QR, tunggu scan, lalu pilih grup
 * tujuan rekap dari daftar bernomor. Dipanggil install.sh saat bot belum siap;
 * bisa juga dijalankan manual kapan saja:
 *
 *   sudo node /opt/izinsiswa/wa-gateway/setup.js
 *
 * Tidak menyentuh WhatsApp langsung: semua lewat gateway (service izinsiswa-wa)
 * di 127.0.0.1, jadi service itu harus sudah berjalan.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  (fs.existsSync(path.join(__dirname, '.env')) ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8') : '')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const BASE = `http://127.0.0.1:${env.PORT || 3001}`;
const API_KEY = env.API_KEY || '';
const SCAN_TIMEOUT_MS = 10 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(p, opts = {}) {
  const res = await fetch(BASE + p, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY, ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// Ctrl+C = lewati setup tanpa menghentikan installer (keluar normal, bukan mati oleh sinyal).
function skip() {
  console.log('\n\nSetup bot WA dilewati. Jalankan lagi kapan saja: sudo node ' + path.join(__dirname, 'setup.js'));
  process.exit(0);
}
process.on('SIGINT', skip);

// ---------- QR di terminal ----------
// Asumsi latar terminal gelap (bawaan PuTTY/SSH): modul TERANG digambar sebagai blok
// putih, modul gelap dibiarkan kosong, seperti qrcode-terminal.
function renderQr(text, columns) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'L' });
  const n = qr.modules.size;
  const quiet = 2;
  const dark = (x, y) => x >= 0 && y >= 0 && x < n && y < n && qr.modules.get(y, x);
  const total = n + quiet * 2;

  // Mode besar: 2 karakter per modul, 1 baris per modul -> persegi di hampir
  // semua terminal. Mode ringkas (setengah blok) hanya bila jendela terlalu sempit.
  if (columns >= total * 2) {
    const lines = [];
    for (let y = -quiet; y < n + quiet; y++) {
      let line = '';
      for (let x = -quiet; x < n + quiet; x++) line += dark(x, y) ? '  ' : '██';
      lines.push(line);
    }
    return { text: lines.join('\n'), big: true, need: total * 2 };
  }
  const lines = [];
  for (let y = -quiet; y < n + quiet; y += 2) {
    let line = '';
    for (let x = -quiet; x < n + quiet; x++) {
      const top = !dark(x, y);
      const bottom = !dark(x, y + 1);
      line += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' ';
    }
    lines.push(line);
  }
  return { text: lines.join('\n'), big: false, need: total * 2 };
}

let currentQr = null;
function drawQr() {
  if (!currentQr) return;
  const cols = process.stdout.columns || 80;
  const { text, big, need } = renderQr(currentQr, cols);
  process.stdout.write('\x1b[2J\x1b[H');
  console.log('=== Hubungkan bot WhatsApp ===');
  console.log('Di HP nomor bot: WhatsApp > Perangkat tertaut > Tautkan perangkat, lalu scan QR ini.\n');
  console.log(text);
  console.log('');
  if (!big) {
    console.log(`QR ditampilkan ringkas karena jendela terminal hanya ${cols} kolom.`);
    console.log(`Bila sulit di-scan, perbesar jendela sampai ${need} kolom atau perkecil font; QR digambar ulang otomatis.`);
  }
  console.log(`QR diganti otomatis tiap beberapa detik. Alternatif: buka ${BASE}/qr lewat tunnel SSH.`);
  console.log('Tekan Ctrl+C untuk melewati langkah ini.');
}
process.stdout.on('resize', drawQr);

async function waitForConnection() {
  const start = Date.now();
  let lastError = '';
  while (Date.now() - start < SCAN_TIMEOUT_MS) {
    try {
      const s = await api('/qr.json');
      if (s.connected) return s.user;
      if (s.qr && s.qr !== currentQr) {
        currentQr = s.qr;
        drawQr();
      } else if (!s.qr && !currentQr) {
        process.stdout.write('\rMenunggu QR dari WhatsApp...   ');
      }
      lastError = '';
    } catch (e) {
      if (e.message !== lastError) console.log(`\nGateway belum merespons (${e.message}), mencoba lagi...`);
      lastError = e.message;
    }
    await sleep(2000);
  }
  throw new Error('QR tidak di-scan dalam 10 menit.');
}

// ---------- Pilih grup ----------
// readline dibuat setelah bot terhubung: selama aktif, terminal dalam mode mentah dan
// Ctrl+C datang sebagai event readline, bukan sinyal ke proses.
// Baris yang diketik sebelum pertanyaan muncul disimpan dulu, supaya tidak hilang.
let rl = null;
let closed = false;
const pending = [];
const waiting = [];
function ask(q) {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('SIGINT', skip);
    rl.on('line', (l) => (waiting.length ? waiting.shift()(l.trim()) : pending.push(l.trim())));
    // Input habis (mis. bukan terminal): jawab "s" = lewati, agar tidak berulang tanpa akhir.
    rl.on('close', () => {
      closed = true;
      while (waiting.length) waiting.shift()('s');
    });
  }
  process.stdout.write(q);
  if (pending.length) {
    const a = pending.shift();
    console.log(a);
    return Promise.resolve(a);
  }
  if (closed) {
    console.log('s');
    return Promise.resolve('s');
  }
  return new Promise((r) => waiting.push(r));
}

async function chooseGroup() {
  const status = await api('/status');
  for (;;) {
    const { groups } = await api('/groups');
    groups.sort((a, b) => a.subject.localeCompare(b.subject, 'id'));
    console.log('\n=== Pilih grup tujuan rekap izin ===');
    if (groups.length === 0) {
      console.log('Bot belum menjadi anggota grup mana pun.');
      const a = await ask('Masukkan nomor bot ke grup guru, lalu tekan Enter untuk memuat ulang (s = lewati): ');
      if (a.toLowerCase() === 's') return null;
      continue;
    }
    groups.forEach((g, i) => {
      const mark = g.id === status.group ? '  (tujuan sekarang)' : '';
      console.log(`  ${String(i + 1).padStart(2)}. ${g.subject}${mark}\n      ${g.id}`);
    });
    const a = await ask(`\nKetik nomor grup [1-${groups.length}], r = muat ulang, s = lewati: `);
    if (a.toLowerCase() === 's') return null;
    if (a.toLowerCase() === 'r' || a === '') continue;
    const n = Number(a);
    if (!Number.isInteger(n) || n < 1 || n > groups.length) {
      console.log('Nomor tidak ada di daftar.');
      continue;
    }
    const g = groups[n - 1];
    await api('/group', { method: 'POST', body: JSON.stringify({ jid: g.id }) });
    console.log(`\nGrup tujuan rekap: ${g.subject} (${g.id})`);
    return g;
  }
}

async function main() {
  if (!API_KEY) throw new Error(`API_KEY kosong di ${path.join(__dirname, '.env')}`);
  const user = await waitForConnection();
  console.log(`\n\nBot WhatsApp terhubung sebagai ${user}.`);

  const g = await chooseGroup();
  if (!g) {
    console.log('Grup belum dipilih. Pilih nanti lewat: sudo node ' + path.join(__dirname, 'setup.js'));
    return;
  }
  const a = await ask('Kirim pesan tes ke grup itu sekarang? (y/N): ');
  if (a.toLowerCase() === 'y') {
    await api('/send', {
      method: 'POST',
      body: JSON.stringify({ message: 'Bot rekap izin IzinSiswa sudah terhubung ke grup ini.' }),
    });
    console.log('Pesan tes terkirim. Cek grup di WhatsApp.');
  }
}

main()
  .catch((e) => {
    console.error(`\nSetup bot WA belum selesai: ${e.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl?.close();
    process.stdout.off('resize', drawQr);
  });
