"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

type StudentResult = {
  id: string;
  fullName: string;
  nis: string;
  grade: string;
  class: string;
};

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (query.trim().length < 2) {
      setError("Masukkan minimal 2 karakter nama atau NIS.");
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(
        `/api/students/search?query=${encodeURIComponent(query.trim())}`
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Terjadi kesalahan.");
        return;
      }
      setResults(json.data);
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 items-start">
          <section aria-labelledby="judul">
            <h1
              id="judul"
              className="text-[1.75rem] leading-tight sm:text-[2rem] font-semibold"
            >
              Ajukan izin tidak masuk sekolah
            </h1>
            <p className="mt-3 text-base text-muted max-w-prose">
              Cari anak Anda dengan nama lengkap atau NIS. Tidak perlu membuat
              akun. Setelah terkirim, Anda mendapat kode tiket untuk memantau
              keputusan sekolah.
            </p>

            <form
              onSubmit={handleSearch}
              className="card mt-6 p-4 sm:p-6"
              role="search"
            >
              <label htmlFor="query" className="label">
                Nama lengkap atau NIS siswa
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="query"
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ketik nama atau NIS"
                  aria-describedby={error ? "query-error" : undefined}
                  className="field sm:flex-1"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary sm:w-auto"
                >
                  {loading ? "Mencari..." : "Cari siswa"}
                </button>
              </div>
              {error && (
                <p id="query-error" role="alert" className="alert-bad mt-3">
                  {error}
                </p>
              )}
            </form>

            <div aria-live="polite">
              {results && (
                <div className="mt-4">
                  {results.length === 0 ? (
                    <div className="card p-5">
                      <p className="font-medium">
                        Tidak ada siswa dengan nama atau NIS &ldquo;{query.trim()}&rdquo;.
                      </p>
                      <p className="hint mt-1">
                        Coba tulis nama lengkap sesuai rapor, atau gunakan NIS.
                        Jika tetap tidak muncul, hubungi tata usaha sekolah.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="hint mb-2">
                        {results.length === 1
                          ? "1 siswa ditemukan. Pastikan nama dan kelasnya benar."
                          : `${results.length} siswa ditemukan. Pilih anak Anda.`}
                      </p>
                      <ul className="card divide-y divide-line overflow-hidden">
                        {results.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/ajukan/${s.id}`}
                              className="flex items-center justify-between gap-3 px-4 py-4 min-h-[64px] hover:bg-sunken transition-colors"
                            >
                              <span className="min-w-0">
                                <span className="block font-semibold text-heading truncate">
                                  {s.fullName}
                                </span>
                                <span className="block text-sm text-muted">
                                  Kelas {s.grade} {s.class} &middot; NIS {s.nis}
                                </span>
                              </span>
                              <span className="flex-none text-sm font-semibold text-link">
                                Pilih
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="border-t-2 border-dashed border-line pt-6 lg:border-t-0 lg:border-l-2 lg:pt-1 lg:pl-8">
            <h2 className="text-lg font-semibold">Siapkan sebelum mulai</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed">
              <li>
                <span className="font-semibold text-heading">Nomor WhatsApp aktif</span>
                <br />
                <span className="text-muted">Untuk dihubungi pihak sekolah bila perlu.</span>
              </li>
              <li>
                <span className="font-semibold text-heading">Kamera HP</span>
                <br />
                <span className="text-muted">
                  Foto wajah orang tua/wali yang mengajukan, sebagai bukti pengajuan.
                </span>
              </li>
              <li>
                <span className="font-semibold text-heading">Surat dokter atau surat resmi</span>
                <br />
                <span className="text-muted">Opsional. PDF, JPG, atau PNG, maksimal 5MB.</span>
              </li>
            </ul>
            <p className="mt-6 text-sm">
              Sudah mengajukan?{" "}
              <Link href="/lacak" className="link font-medium">
                Lacak dengan kode tiket
              </Link>
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
