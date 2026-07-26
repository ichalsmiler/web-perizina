"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { STATUS_LABELS, leaveTypeLabel } from "@/lib/constants";

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

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "bg-success/10 text-success";
  if (status === "REJECTED") return "bg-danger/10 text-danger";
  return "bg-secondary/10 text-secondary";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [studentName, setStudentName] = useState("");
  const [ticketCode, setTicketCode] = useState("");
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (studentName) params.set("studentName", studentName);
    if (ticketCode) params.set("ticketCode", ticketCode);
    params.set("page", String(page));
    params.set("limit", "10");

    const res = await fetch(`/api/admin/leave-requests?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setRows(json.data);
      setPagination(json.pagination);
    }
    setLoading(false);
  }, [status, studentName, ticketCode, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter-driven data fetch
    load();
  }, [load]);

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Permohonan Izin</h1>
        <a
          href={`/api/admin/leave-requests/export${status ? `?status=${status}` : ""}`}
          className="text-sm bg-neutral-dark text-white rounded-md px-3 py-1.5 hover:bg-primary transition-colors"
        >
          Ekspor CSV
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-neutral-medium block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="border border-neutral-medium rounded-md px-2 py-1.5 text-sm"
          >
            <option value="">Semua</option>
            <option value="PENDING">Menunggu</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-medium block mb-1">Nama Siswa</label>
          <input
            value={studentName}
            onChange={(e) => {
              setPage(1);
              setStudentName(e.target.value);
            }}
            placeholder="Cari nama siswa"
            className="border border-neutral-medium rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-medium block mb-1">Kode Tiket</label>
          <input
            value={ticketCode}
            onChange={(e) => {
              setPage(1);
              setTicketCode(e.target.value);
            }}
            placeholder="IZS-..."
            className="border border-neutral-medium rounded-md px-2 py-1.5 text-sm font-mono"
          />
        </div>
        {!loading && (
          <span className="text-xs text-neutral-medium ml-auto">
            {pendingCount} permohonan menunggu di halaman ini &middot;{" "}
            {pagination.totalItems} total
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-medium border-b border-neutral-light">
              <th className="p-3">Kode Tiket</th>
              <th className="p-3">Siswa</th>
              <th className="p-3">Jenis Izin</th>
              <th className="p-3">Tanggal</th>
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
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-4 text-neutral-medium" colSpan={6}>
                  Tidak ada permohonan izin yang sesuai.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-light last:border-0">
                  <td className="p-3 font-mono text-xs">{r.ticketCode}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.studentName}</div>
                    <div className="text-xs text-neutral-medium">
                      Kelas {r.studentClass}
                      {r.parentName ? ` · ${r.parentName}` : ""}
                    </div>
                  </td>
                  <td className="p-3">{leaveTypeLabel(r.leaveType)}</td>
                  <td className="p-3 text-xs">
                    {formatDate(r.startDate)} &ndash; {formatDate(r.endDate)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadgeClass(
                        r.status
                      )}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/requests/${r.id}`}
                      className="text-secondary hover:underline text-xs"
                    >
                      Lihat Detail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-md text-sm ${
                  p === page
                    ? "bg-primary text-white"
                    : "bg-white text-neutral-dark hover:bg-neutral-light"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
