# Rekap izin ke grup WhatsApp

Gateway kecil (Baileys) yang mengirim rekap izin ke satu grup WA guru.
Hari dan jam sesinya diatur admin di aplikasi, menu **Pengaturan**
(bawaan: Senin sampai Jumat pukul 07.15, 07.45, dan 08.15 WITA).

Isi rekap: izin yang **diajukan hari ini** (sejak 00.00 WITA) dan **sudah
disetujui admin**. Daftarnya kumulatif: sesi 07.45 memuat ulang sesi 07.15
ditambah izin yang disetujui sesudahnya. Hari berikutnya mulai dari nol.

```
📋 Rekap Izin — Senin, 2 November 2026
Sesi 07.45 WITA — Daftar izin hari ini s/d 07.45 WITA

1. Ahmad Fauzi - 11 IPS 2 - Sakit
2. Siti Nurhaliza - 9 A - Izin

Total: 2 izin.
```

Kalau belum ada izin yang disetujui, sesi itu tidak mengirim apa-apa
(`SEND_IF_EMPTY=false`).

## Peringatan

Baileys memakai protokol WhatsApp Web, bukan API resmi. Nomor bisa diblokir
WhatsApp bila dipakai spam. Volume 3 pesan per hari kecil, tetapi tetap pakai
**nomor khusus untuk bot**, bukan nomor pribadi.

## Memasang

Dari server, sekali saja:

```bash
sudo WA_GATEWAY=1 bash /opt/izinsiswa/install.sh
```

Installer akan:
- menambah `WA_REKAP_TOKEN` acak ke `web/.env`;
- membuat `wa-gateway/.env` dengan `API_KEY` acak dan token yang sama;
- memasang service `izinsiswa-wa` (hanya dengar di `127.0.0.1:3001`).

Update berikutnya (`sudo bash /opt/izinsiswa/install.sh`) otomatis ikut
memperbarui gateway; `WA_GATEWAY=1` tidak perlu ditulis lagi.

Bila bot belum terhubung atau grup belum dipilih, installer langsung
menjalankan setup di terminal:

1. QR tampil di terminal. Scan dari HP nomor bot (WhatsApp > Perangkat
   tertaut > Tautkan perangkat). QR digambar persegi bila jendela minimal
   114 kolom × 57 baris; perbesar jendela atau perkecil font bila perlu,
   QR digambar ulang otomatis. Ctrl+C melewati langkah ini.
2. Setelah terhubung, muncul daftar grup bernomor. Ketik nomor grup guru.
   Bot harus sudah menjadi anggota grup itu (`r` memuat ulang daftar).
3. Pilih `y` untuk mengirim pesan tes ke grup itu.

Setup yang sama bisa dijalankan kapan saja, mis. untuk ganti grup atau
setelah bot dilepas dari HP:

```bash
sudo node /opt/izinsiswa/wa-gateway/setup.js
```

Kalau bot dilepas dari HP (logout), gateway menghapus sesi lama dan
menyiapkan QR baru dengan sendirinya.

### Lewat browser (alternatif)

1. Scan QR dengan nomor WA bot (WhatsApp > Perangkat Tertaut > Tautkan Perangkat).

   QR sebagai gambar (disarankan; QR di terminal sering tampil gepeng):
   buka tunnel SSH dari PC ke server, lalu buka `http://localhost:3001/qr`
   di browser PC. Halaman memuat ulang sendiri dan berubah menjadi
   "Bot sudah terhubung" setelah scan berhasil.

   - PowerShell / terminal di PC (biarkan jendelanya terbuka selama scan):

     ```bash
     ssh -L 3001:127.0.0.1:3001 root@172.16.32.209
     ```

   - PuTTY: Connection > SSH > Tunnels, isi Source port `3001` dan
     Destination `127.0.0.1:3001`, klik Add, lalu sambungkan seperti biasa.

   QR di terminal (bila terminalnya menampilkan QR dengan benar):

   ```bash
   sudo journalctl -u izinsiswa-wa -f -o cat
   ```

2. Masukkan nomor bot ke grup guru. Setelah terhubung, halaman
   `http://localhost:3001/qr` menampilkan semua grup yang diikuti bot:
   - **Jadikan tujuan rekap** menyimpan grup itu sebagai `GROUP_JID` di
     `wa-gateway/.env` dan langsung berlaku, tanpa restart.
   - **Salin ID** menyalin ID grup (berakhiran `@g.us`).
   - **Kirim rekap sekarang (tes)** mengirim rekap hari ini ke grup tujuan.

   Grup yang baru dimasuki bot muncul setelah halaman dimuat ulang.

## Tanpa browser (lewat terminal server)

```bash
curl -s http://127.0.0.1:3001/status
sudo bash -c 'curl -s -H "X-Api-Key: $(grep ^API_KEY= /opt/izinsiswa/wa-gateway/.env | cut -d= -f2)" http://127.0.0.1:3001/groups'
sudo bash -c 'curl -s -X POST -H "X-Api-Key: $(grep ^API_KEY= /opt/izinsiswa/wa-gateway/.env | cut -d= -f2)" http://127.0.0.1:3001/kirim-rekap'
```

`GROUP_JID` juga bisa diisi manual di `wa-gateway/.env`, lalu
`sudo systemctl restart izinsiswa-wa`.

## Mengubah jadwal

Buka aplikasi sebagai admin, menu **Pengaturan**. Di sana bisa diatur:
rekap otomatis aktif atau tidak, hari kirim, dan jam setiap sesi (format
24 jam, WITA, maksimal 10 sesi). Gateway membaca jadwal itu setiap menit,
jadi perubahan berlaku paling lambat 1 menit setelah disimpan, tanpa restart.

`SCHEDULER_ENABLED=false` di `wa-gateway/.env` menghentikan pengiriman
terjadwal sepenuhnya (perlu restart service), tanpa melepas bot.

## Sesi login bot

Sesi tersimpan di `wa-gateway/auth_info_baileys/`: jangan dibagikan.
Installer ikut membackupnya ke `/var/backups/izinsiswa/` setiap update.
Bila bot dilepas dari HP, gateway menghapus sesi itu sendiri; scan QR baru
lewat `sudo node /opt/izinsiswa/wa-gateway/setup.js`.
