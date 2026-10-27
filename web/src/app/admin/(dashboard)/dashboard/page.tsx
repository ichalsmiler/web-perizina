"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { leaveTypeLabel } from "@/lib/constants";
import StatusLabel from "@/components/StatusLabel";

type Row = {
  id: string;
  ticketCode: string;
  studentName: string;
  studentClass: string;
  parentName: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
};

const STATUS_FILTERS = [
  { value: "PENDING", label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "", label: "Semua" },
];

const EMPTY_TEXT: Record<string, string> = {
  PENDING: "Tidak ada permohonan yang menunggu. Pengajuan baru dari orang tua akan muncul di sini.",
  APPROVED: "Belum ada permohonan yang disetujui.",
  REJECTED: "Belum ada permohonan yang ditolak.",
  "": "Belum ada permohonan izin yang masuk.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatRange(start: string, end: string) {
  return start.slice(0, 10) === end.slice(0, 10)
    ? formatDate(start)
    : `${formatDate(start)} sampai ${formatDate(end)}`;
}

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState("PENDING");
  const [studentName, setStudentName] = useState("");
  const [ticketCode, setTicketCode] = useState("");
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (studentName) params.set("studentName", studentName);
    if (ticketCode) params.set("ticketCode", ticketCode);
    params.set("page", String(page));
    params.set("limit", "10");

    try {
      const res = await fetch(`/api/admin/leave-requests?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error();
      setRows(json.data);
      setPagination(json.pagination);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [status, studentName, ticketCode, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter-driven data fetch
    load();
  }, [load]);

  const isFiltered = !!studentName || !!ticketCode;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold">Permohonan izin</h1>
          <p className="text-sm text-muted mt-1">
            Buka permohonan untuk memeriksa foto dan dokumen, lalu setujui atau tolak.
          </p>
        </div>
        <a
          href={`/api/admin/leave-requests/export${status ? `?status=${status}` : ""}`}
          className="btn btn-sm btn-secondary"
        >
          Unduh CSV
          {status ? ` (${STATUS_FILTERS.find((f) => f.value === status)?.label})` : ""}
        </a>
      </div>

      <div className="card p-3 sm:p-4 mb-4">
        <div
          role="group"
          aria-label="Saring status"
          className="grid grid-cols-2 min-[520px]:grid-cols-4 gap-1 p-1 bg-sunken rounded"
        >
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => {
                setPage(1);
                setStatus(f.value);
              }}
              className={`min-h-[44px] rounded text-sm font-semibold transition-colors ${
                status === f.value
                  ? "bg-surface text-heading border border-field"
                  : "text-muted hover:text-ink border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="f-name" className="label">
              Nama siswa
            </label>
            <input
              id="f-name"
              value={studentName}
              onChange={(e) => {
                setPage(1);
                setStudentName(e.target.value);
              }}
              placeholder="Ketik nama siswa"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="f-ticket" className="label">
              Kode tiket
            </label>
            <input
              id="f-ticket"
              value={ticketCode}
              onChange={(e) => {
                setPage(1);
                setTicketCode(e.target.value);
              }}
              placeholder="IZS-..."
              spellCheck={false}
              className="field font-mono"
            />
          </div>
        </div>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p className="card p-5 text-muted">Memuat permohonan izin...</p>
        ) : loadError ? (
          <div role="alert" className="alert-bad flex flex-wrap items-center justify-between gap-3">
            <span>Daftar permohonan gagal dimuat. Periksa koneksi ke server.</span>
            <button type="button" onClick={load} className="btn btn-sm btn-secondary">
              Muat ulang
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="card p-5">
            <p className="font-medium">
              {isFiltered
                ? "Tidak ada permohonan yang cocok dengan nama atau kode tiket ini."
                : EMPTY_TEXT[status]}
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setStudentName("");
                  setTicketCode("");
                }}
                className="btn btn-sm btn-secondary mt-3"
              >
                Hapus pencarian
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-2">
              {pagination.totalItems} permohonan
              {pagination.totalPages > 1 ? `, halaman ${page} dari ${pagination.totalPages}` : ""}
            </p>

            {/* Layar lebar: tabel agar admin bisa memindai banyak baris. */}
            <div className="card hidden md:block overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-sunken text-left text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Siswa</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Jenis izin</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Tanggal izin</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-sunken">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-heading">{r.studentName}</div>
                        <div className="text-muted">
                          Kelas {r.studentClass}
                          {r.parentName ? `, diajukan ${r.parentName}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">{leaveTypeLabel(r.leaveType)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatRange(r.startDate, r.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusLabel status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/requests/${r.id}`}
                          className="btn btn-sm btn-secondary"
                          aria-label={`Periksa permohonan ${r.studentName}`}
                        >
                          {r.status === "PENDING" ? "Periksa" : "Lihat"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* HP: kartu yang seluruhnya bisa diketuk. */}
            <ul className="md:hidden flex flex-col gap-2">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="card block p-4 hover:bg-sunken"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-semibold text-heading truncate">
                          {r.studentName}
                        </span>
                        <span className="block text-sm text-muted">Kelas {r.studentClass}</span>
                      </span>
                      <StatusLabel status={r.status} />
                    </div>
                    <p className="text-sm mt-2">
                      {leaveTypeLabel(r.leaveType)}, {formatRange(r.startDate, r.endDate)}
                    </p>
                    {r.parentName && (
                      <p className="text-sm text-muted">Diajukan {r.parentName}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!loading && !loadError && pagination.totalPages > 1 && (
        <nav aria-label="Halaman" className="flex flex-wrap justify-center gap-2 mt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`min-w-[44px] min-h-[44px] rounded text-sm font-semibold border ${
                p === page
                  ? "bg-brand text-on-brand border-brand"
                  : "bg-surface text-ink border-field hover:bg-sunken"
              }`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
