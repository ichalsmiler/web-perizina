"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StudentResult = {
  id: string;
  fullName: string;
  nis: string;
  grade: string;
  class: string;
};

export default function HomePage() {
  const router = useRouter();
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
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-primary">IzinSiswa</h1>
          <p className="text-sm text-neutral-medium mt-2">
            Ajukan izin siswa secara digital. Tidak perlu akun — cukup cari
            nama atau NIS anak Anda.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="bg-white rounded-lg shadow-sm p-6 flex flex-col gap-3"
        >
          <label htmlFor="query" className="text-sm font-medium">
            Masukkan Nama Lengkap atau NIS Siswa
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Contoh: Jane Doe atau 0012345678"
            className="border border-neutral-medium rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white rounded-md py-2 text-sm font-medium hover:bg-neutral-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Mencari..." : "Cari Siswa"}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>

        {results && (
          <div className="mt-4 bg-white rounded-lg shadow-sm divide-y divide-neutral-light">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-neutral-medium">
                Siswa tidak ditemukan. Periksa kembali nama atau NIS, atau
                hubungi admin sekolah.
              </p>
            ) : (
              results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/ajukan/${s.id}`)}
                  className="w-full text-left p-4 hover:bg-neutral-light transition-colors flex items-center justify-between"
                >
                  <span>
                    <span className="block font-medium">{s.fullName}</span>
                    <span className="block text-xs text-neutral-medium">
                      NIS {s.nis} &middot; Kelas {s.grade} {s.class}
                    </span>
                  </span>
                  <span className="text-secondary text-sm">Pilih &rarr;</span>
                </button>
              ))
            )}
          </div>
        )}

        <div className="text-center mt-6">
          <a href="/lacak" className="text-sm text-secondary hover:underline">
            Sudah punya kode tiket? Lacak status pengajuan
          </a>
        </div>
      </div>
    </main>
  );
}
