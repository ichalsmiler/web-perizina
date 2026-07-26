# IzinSiswa — Web App (Prototipe Lokal)

Implementasi web dari `PRD.md` / `REQUIREMENTS.md` di root repo. Prototipe ini
berjalan sepenuhnya lokal: SQLite sebagai database dan penyimpanan file lokal
sebagai pengganti AWS S3 (lihat `src/lib/storage.ts` — file disimpan di
`storage/`, disajikan hanya melalui rute `/api/files/...` yang mensyaratkan
sesi Admin, meniru "akses hanya via pre-signed URL").

## Menjalankan

```bash
npm install
npx prisma migrate dev   # sekali saja / setelah ubah schema
npm run seed              # membuat akun admin + contoh siswa
npm run dev
```

Buka http://localhost:3000

- **Orang tua** (tanpa akun): halaman utama → cari siswa (nama/NIS) → konfirmasi → isi form izin (termasuk nama & WhatsApp orang tua) → dapat kode tiket → cek status di `/lacak`.
- **Admin**: `/admin/login`
  - Email: `admin@izinsiswa.sch.id`
  - Password: `admin123`

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
