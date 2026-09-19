"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { STATUS_LABELS, leaveTypeLabel } from "@/lib/constants";

type TrackResult = {
  ticketCode: string;
  studentName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: string;
};

function statusBadgeClass(status: string) {
  if (status === "APPROVED") return "bg-success/10 text-success";
  if (status === "REJECTED") return "bg-danger/10 text-danger";
  return "bg-secondary/10 text-secondary";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function TrackForm() {
  const searchParams = useSearchParams();
  const [ticketCode, setTicketCode] = useState(
    searchParams.get("ticketCode") ?? ""
  );
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTrack(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setResult(null);

    if (!ticketCode.trim()) {
      setError("Masukkan kode tiket Anda.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/leave-requests/track?ticketCode=${encodeURIComponent(
          ticketCode.trim()
        )}`
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Kode tiket tidak ditemukan.");
        return;
      }
      setResult(json.data);
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("ticketCode")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-track from shared link's query param
      handleTrack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-primary">
          Lacak Status Pengajuan
        </h1>
        <p className="text-sm text-neutral-medium mt-2">
          Masukkan kode tiket yang Anda terima saat mengajukan izin.
        </p>
      </div>

      <form
        onSubmit={handleTrack}
        className="bg-white rounded-lg shadow-sm p-5 sm:p-6 flex flex-col gap-3"
      >
        <label htmlFor="ticketCode" className="text-sm font-medium">
          Kode Tiket
        </label>
        <input
          id="ticketCode"
          type="text"
          inputMode="text"
          enterKeyHint="search"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value)}
          placeholder="Contoh: IZS-7K3PQR2X"
          className="border border-neutral-medium rounded-md px-3 py-2.5 font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded-md py-3 text-base font-medium hover:bg-neutral-dark active:bg-neutral-dark transition-colors disabled:opacity-60"
        >
          {loading ? "Mencari..." : "Cek Status"}
        </button>
        {error && (
          <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2.5">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="mt-4 bg-white rounded-lg shadow-sm p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="font-semibold min-w-0 truncate">
              {result.studentName}
            </p>
            <span
              className={`flex-none text-xs px-2.5 py-1 rounded-full font-medium ${statusBadgeClass(
                result.status
              )}`}
            >
              {STATUS_LABELS[result.status]}
            </span>
          </div>
          <dl className="text-sm space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-medium flex-none">Jenis Izin</dt>
              <dd className="text-right">{leaveTypeLabel(result.leaveType)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-medium flex-none">Tanggal</dt>
              <dd className="text-right">
                {formatDate(result.startDate)} &ndash;{" "}
                {formatDate(result.endDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-medium flex-none">Diajukan</dt>
              <dd className="text-right">{formatDate(result.submittedAt)}</dd>
            </div>
          </dl>
          {result.status === "REJECTED" && result.rejectionReason && (
            <div className="mt-4 bg-danger/5 border border-danger/20 rounded-md p-3">
              <p className="text-xs font-medium text-danger mb-1">
                Alasan Penolakan
              </p>
              <p className="text-sm">{result.rejectionReason}</p>
            </div>
          )}
        </div>
      )}

      <div className="text-center mt-5">
        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[44px] px-4 text-sm text-secondary hover:underline"
        >
          &larr; Kembali ke pencarian siswa
        </Link>
      </div>
    </div>
  );
}

export default function LacakPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <Suspense>
        <TrackForm />
      </Suspense>
    </main>
  );
}
