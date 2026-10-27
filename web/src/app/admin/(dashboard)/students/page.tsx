"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Student = {
  id: string;
  nis: string;
  fullName: string;
  grade: string;
  class: string;
  parentName: string | null;
  parentPhone: string | null;
  isActive: boolean;
};

function ActiveLabel({ active }: { active: boolean }) {
  return active ? (
    <span className="text-sm font-medium text-ok-text">Aktif</span>
  ) : (
    <span className="text-sm font-medium text-muted">Nonaktif</span>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    params.set("limit", "50");
    try {
      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error();
      setStudents(json.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + search-driven data fetch
    load();
  }, [load]);

  async function handleDeactivate(s: Student) {
    if (!confirm(`Nonaktifkan ${s.fullName}? Riwayat izinnya tetap tersimpan.`)) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/students/${s.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message ?? "Gagal menonaktifkan siswa.");
        return;
      }
    } catch {
      setActionError("Gagal terhubung ke server.");
      return;
    }
    load();
  }

  function contact(s: Student) {
    if (!s.parentName && !s.parentPhone) {
      return <span className="text-muted">Belum diisi</span>;
    }
    return (
      <>
        {s.parentName ?? "Nama belum diisi"}
        {s.parentPhone && <span className="block font-mono text-muted">{s.parentPhone}</span>}
      </>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold">Data siswa</h1>
          <p className="text-sm text-muted mt-1">
            Hanya siswa aktif yang bisa dicari orang tua di halaman pengajuan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/students/bulk-upload" className="btn btn-sm btn-secondary">
            Impor dari Excel
          </Link>
          <Link href="/admin/students/new" className="btn btn-sm btn-primary">
            Tambah siswa
          </Link>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <label htmlFor="s-query" className="label">
          Cari siswa
        </label>
        <input
          id="s-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nama atau NIS"
          className="field"
        />
      </div>

      {actionError && (
        <p role="alert" className="alert-bad mb-3">
          {actionError}
        </p>
      )}

      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p className="card p-5 text-muted">Memuat data siswa...</p>
        ) : loadError ? (
          <div role="alert" className="alert-bad flex flex-wrap items-center justify-between gap-3">
            <span>Data siswa gagal dimuat. Periksa koneksi ke server.</span>
            <button type="button" onClick={load} className="btn btn-sm btn-secondary">
              Muat ulang
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="card p-5">
            {query ? (
              <p className="font-medium">Tidak ada siswa dengan nama atau NIS &ldquo;{query}&rdquo;.</p>
            ) : (
              <>
                <p className="font-medium">Belum ada data siswa.</p>
                <p className="hint mt-1">
                  Tambahkan satu per satu, atau impor sekaligus dari file Excel.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="card hidden md:block overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-sunken text-left text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Nama</th>
                    <th scope="col" className="px-4 py-3 font-semibold">NIS</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kelas</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Kontak orang tua</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-semibold text-heading">{s.fullName}</td>
                      <td className="px-4 py-3 font-mono">{s.nis}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.grade} {s.class}
                      </td>
                      <td className="px-4 py-3">{contact(s)}</td>
                      <td className="px-4 py-3">
                        <ActiveLabel active={s.isActive} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/students/${s.id}/edit`}
                            className="btn btn-sm btn-secondary"
                            aria-label={`Ubah data ${s.fullName}`}
                          >
                            Ubah
                          </Link>
                          {s.isActive && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(s)}
                              className="btn btn-sm btn-bad-outline"
                              aria-label={`Nonaktifkan ${s.fullName}`}
                            >
                              Nonaktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden flex flex-col gap-2">
              {students.map((s) => (
                <li key={s.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-heading">{s.fullName}</span>
                      <span className="block text-sm text-muted">
                        Kelas {s.grade} {s.class} &middot; <span className="font-mono">{s.nis}</span>
                      </span>
                    </span>
                    <ActiveLabel active={s.isActive} />
                  </div>
                  <div className="text-sm mt-2">{contact(s)}</div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/admin/students/${s.id}/edit`}
                      className="btn btn-sm btn-secondary flex-1"
                      aria-label={`Ubah data ${s.fullName}`}
                    >
                      Ubah
                    </Link>
                    {s.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(s)}
                        className="btn btn-sm btn-bad-outline flex-1"
                        aria-label={`Nonaktifkan ${s.fullName}`}
                      >
                        Nonaktifkan
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
