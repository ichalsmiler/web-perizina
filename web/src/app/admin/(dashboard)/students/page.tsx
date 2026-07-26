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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    params.set("limit", "50");
    const res = await fetch(`/api/admin/students?${params.toString()}`);
    const json = await res.json();
    if (json.success) setStudents(json.data);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + search-driven data fetch
    load();
  }, [load]);

  async function handleDeactivate(id: string) {
    if (!confirm("Nonaktifkan siswa ini? Data historis tetap tersimpan.")) return;
    await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Data Siswa</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/students/bulk-upload"
            className="text-sm bg-white border border-neutral-medium rounded-md px-3 py-1.5 hover:bg-neutral-light transition-colors"
          >
            Upload Excel
          </Link>
          <Link
            href="/admin/students/new"
            className="text-sm bg-primary text-white rounded-md px-3 py-1.5 hover:bg-neutral-dark transition-colors"
          >
            + Tambah Siswa
          </Link>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari nama atau NIS..."
        className="border border-neutral-medium rounded-md px-3 py-2 text-sm mb-4 w-full max-w-sm"
      />

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-medium border-b border-neutral-light">
              <th className="p-3">NIS</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Kelas</th>
              <th className="p-3">Kontak Ortu</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-neutral-medium" colSpan={6}>
                  Memuat...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td className="p-4 text-neutral-medium" colSpan={6}>
                  Tidak ada data siswa. Klik &quot;Tambah Siswa&quot; untuk memulai.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-b border-neutral-light last:border-0">
                  <td className="p-3 font-mono text-xs">{s.nis}</td>
                  <td className="p-3 font-medium">{s.fullName}</td>
                  <td className="p-3">
                    {s.grade} {s.class}
                  </td>
                  <td className="p-3 text-xs">
                    {s.parentName ? (
                      <>
                        {s.parentName}
                        <br />
                        {s.parentPhone}
                      </>
                    ) : (
                      <span className="text-neutral-medium">Belum diisi</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        s.isActive
                          ? "bg-success/10 text-success"
                          : "bg-neutral-medium/20 text-neutral-medium"
                      }`}
                    >
                      {s.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/students/${s.id}/edit`}
                      className="text-secondary hover:underline text-xs mr-3"
                    >
                      Edit
                    </Link>
                    {s.isActive && (
                      <button
                        onClick={() => handleDeactivate(s.id)}
                        className="text-danger hover:underline text-xs"
                      >
                        Nonaktifkan
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
