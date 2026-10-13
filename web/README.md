# IzinSiswa — Web App (Prototipe Lokal)

Implementasi web dari `PRD.md` / `REQUIREMENTS.md` di root repo. Prototipe ini
berjalan sepenuhnya lokal: SQLite sebagai database dan penyimpanan file lokal
sebagai pengganti AWS S3 (lihat `src/lib/storage.ts` — file disimpan di
`storage/`, disajikan hanya melalui rute `/api/files/...` yang mensyaratkan
sesi Admin, meniru "akses hanya via pre-signed URL").

## Menjalankan

```bash
npm install
cp .env.example .env
# Isi JWT_SECRET di .env dengan hasil: openssl rand -base64 48
npx prisma migrate dev   # sekali saja / setelah ubah schema
npm run seed              # membuat akun admin + contoh siswa
npm run dev
```

Buka http://localhost:3000

- **Orang tua** (tanpa akun): halaman utama → cari siswa (nama/NIS) → konfirmasi → isi form izin (termasuk nama & WhatsApp orang tua) → dapat kode tiket → cek status di `/lacak`.
- **Admin**: `/admin/login`
  - Username: sesuai `ADMIN_USERNAME` saat seed (default: `admin`).
  - Password: sesuai `ADMIN_PASSWORD`, atau password acak yang dicetak sekali saat seed.

## Struktur

- `prisma/schema.prisma` — model `AdminUser`, `Student`, `LeaveRequest` (SQLite untuk lokal; ganti provider ke `postgresql` untuk produksi).
- `src/lib/storage.ts` — stand-in untuk S3. Ganti isi fungsi ini untuk beralih ke S3 asli.
- `src/lib/auth.ts` + `src/proxy.ts` — sesi Admin berbasis JWT di cookie httpOnly; melindungi semua rute `/admin/*` dan `/api/admin/*`.
- `src/app/(parent pages)` — `/`, `/ajukan/[studentId]`, `/lacak` (publik, tanpa login).
- `src/app/admin/(dashboard)` — dashboard, detail permohonan, manajemen siswa, upload Excel (perlu login Admin).

## Catatan Verifikasi Selfie

Komponen `SelfieCapture` hanya mengaktifkan kamera langsung (`getUserMedia`),
sengaja tanpa `<input type="file">`, agar tidak bisa diganti foto dari galeri.
Uji fitur ini di browser sungguhan dengan izin kamera aktif — lingkungan
otomatis/sandbox tanpa kamera akan menampilkan pesan "akses kamera ditolak"
alih-alih benar-benar menangkap foto.

## Menuju Produksi

Untuk mengganti ke skala produksi sesuai PRD:
1. Ganti `datasource` Prisma ke `postgresql` dan set `DATABASE_URL` yang sesuai.
2. Ganti `src/lib/storage.ts` agar mengunggah ke AWS S3 dan mengembalikan pre-signed URL, bukan path lokal.
3. Set `JWT_SECRET` yang kuat via environment variable pada hosting.
4. Deploy ke AWS Amplify (atau platform Node.js lain) sesuai `PRD.md`.

## Perlindungan secret dan API

- `JWT_SECRET` wajib diisi dengan nilai acak yang kuat (minimal 32 byte); aplikasi menolak membuat sesi jika secret kosong, pendek, atau masih memakai placeholder lama.
- Simpan secret di environment server atau `web/.env` yang diabaikan Git. Jangan memakai awalan `NEXT_PUBLIC_` untuk API key, token layanan, atau password database.
- Token sesi hanya dikirim melalui cookie HttpOnly, tidak melalui JSON. Gunakan HTTPS untuk melindungi cookie selama transmisi.
- Endpoint yang dipakai browser tetap terlihat di Network. Rute Admin dan berkas unggahan memerlukan sesi Admin yang valid.
- Jika pernah memakai secret bawaan atau membagikan secret asli, ganti `JWT_SECRET` di server dengan nilai baru lalu restart layanan. Semua sesi lama akan menjadi tidak valid. Menghapus nilai dari kode tidak mencabut secret yang sudah tersebar atau menghapus riwayat Git.
