# Laporan izin harian pukul 07.30 WITA

Setiap hari penjadwal server membuat arsip izin yang berlaku pada tanggal itu,
berstatus APPROVED, dan telah diproses paling lambat 07.30 WITA (Asia/Makassar).
Izin beberapa hari tetap muncul selama tanggal laporan berada dalam periode izin.
Persetujuan pukul 07.30 tepat termasuk; setelah itu tidak termasuk laporan pagi.
Laporan tersimpan dan tidak berubah ketika data siswa berubah atau jadwal dijalankan ulang.

Admin membuka `/admin/reports` untuk melihat arsip, mengunduh Excel, dan memeriksa
status pengiriman Telegram. Halaman memuat ulang data setiap 30 detik. Laporan
dibuat oleh server sekalipun dashboard tidak terbuka.

## Konfigurasi chat pribadi Telegram

1. Gunakan bot sendiri atau buat melalui [BotFather](https://t.me/BotFather).
2. Buka chat pribadi dengan bot dan kirim `/start`.
3. Isi **di server**, dalam `web/.env` (jangan commit atau kirim token lewat chat):

   ```dotenv
   TELEGRAM_REPORT_ENABLED=false
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_CHAT_ID=
   ```

   Isi `TELEGRAM_BOT_TOKEN` dengan token bot asli. Nilai-nilai ini tidak memakai
   awalan `NEXT_PUBLIC_` dan tidak pernah dikirim ke frontend.

4. Jika chat ID belum diketahui, dari direktori `web` jalankan:

   ```bash
   node --env-file=.env --import tsx scripts/telegramChatId.ts
   ```

   Pilih ID chat pribadi Anda dari hasil, lalu isi `TELEGRAM_CHAT_ID` (angka
   positif). Jika beberapa ID muncul, pastikan tujuan adalah chat Anda sendiri.
   Untuk bot yang telah memakai webhook, gunakan ID yang sudah diketahui dari
   integrasi tersebut; helper tidak menghapus webhook.

5. Ubah `TELEGRAM_REPORT_ENABLED=true` hanya setelah tujuan sudah benar. Pengaturan
   ini mengaktifkan pengiriman nama siswa, NIS, kelas, jenis izin, periode, dan
   waktu/admin persetujuan dalam Excel ke chat pribadi tersebut melalui Telegram.
   Nomor orang tua, selfie, dokumen pendukung, dan alasan izin tidak disertakan.
   Bot memverifikasi bahwa tujuan benar-benar bertipe private sebelum mengunggah.

## Deploy pada Ubuntu

Gabungkan perbaikan keamanan secret terlebih dahulu. Setelah kode ini tersedia
di server, jalankan installer biasa (`sudo bash deploy/install-ubuntu.sh` atau
`sudo bash install.sh`). Installer menjalankan migrasi, build, dan memasang:

- `izinsiswa-report.service`: membuat arsip dan, bila diaktifkan, mengirim laporan.
- `izinsiswa-report.timer`: jadwal setiap hari pukul 07.30 WITA, bukan timezone host.

Pastikan dependensi pengembangan terpasang (`npm ci`), karena runner memakai `tsx`.
Tidak perlu membuka endpoint cron publik atau membagikan cookie/JWT admin.

```bash
sudo systemctl list-timers izinsiswa-report.timer
sudo systemctl status izinsiswa-report.timer
sudo journalctl -u izinsiswa-report.service -n 30 --no-pager
```

Untuk mengecek secara manual **sesudah 07.30 WITA**, termasuk mengirim ke Telegram
jika diaktifkan:

```bash
sudo systemctl start izinsiswa-report.service
```

Sebelum 07.30 runner tidak membuat laporan dan tidak mengirim pesan. Laporan kosong
tetap dikirim dengan jumlah 0. Ringkasan Telegram dilengkapi Excel dengan seluruh
baris; tidak terpotong oleh batas panjang pesan.

## Kegagalan dan pemulihan

Penjadwal menggunakan `Persistent=true`: jika server mati pada jadwal, laporan
dibuat ketika penjadwal aktif lagi. Runner hanya mengejar laporan untuk tanggal
WITA saat itu, tidak mengirim seluruh hari yang terlewat. Batas persetujuan tetap
07.30, dan waktu pembuatan sebenarnya dicatat. Jam pengiriman bergantung pada
ketersediaan server/jaringan; server harus aktif agar dapat mengirim tepat jadwal.

Pengiriman sukses diberi status SENT dan tidak diulang. Penolakan Telegram yang
pasti diberi FAILED dan service mencoba ulang secara terbatas. Timeout, respons
tidak jelas, atau proses terputus bisa meninggalkan UNKNOWN/SENDING; pengiriman
tidak diulang otomatis untuk menghindari duplikasi. Periksa chat dan log terlebih
dahulu. Jika perlu dikirim ulang, operator dapat mengubah status arsip tanggal
yang benar dari UNKNOWN/SENDING menjadi FAILED melalui Prisma Studio di server,
lalu menjalankan service lagi. Jangan reset SENT untuk percobaan rutin.

Migrasi memakai `updatedAt` sebagai waktu proses untuk keputusan lama karena
aplikasi sebelumnya belum memiliki `processedAt`; keputusan baru mencatat waktu
proses secara eksplisit. Arsip hari sebelum fitur dipasang tidak dibuat otomatis.

## Pengujian

```bash
node --import tsx --test src/lib/reportWindow.test.ts src/lib/telegramReport.test.ts
npm run build
```

Pengujian Telegram memakai transport tiruan, sehingga tidak mengirim data siswa
atau menggunakan token bot asli.

Referensi: [Telegram Bot API](https://core.telegram.org/bots/api#senddocument),
[systemd timer](https://github.com/systemd/systemd/blob/main/man/systemd.timer.xml),
[systemd calendar/timezone](https://github.com/systemd/systemd/blob/main/man/systemd.time.xml).
