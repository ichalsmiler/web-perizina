"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { leaveTypeLabel } from "@/lib/constants";
import SiteHeader from "@/components/SiteHeader";
import StatusLabel from "@/components/StatusLabel";

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

const STATUS_NOTE: Record<TrackResult["status"], string> = {
  PENDING: "Sekolah belum memproses pengajuan ini. Buka halaman ini lagi nanti.",
  APPROVED: "Izin disetujui sekolah. Tidak ada langkah lanjutan.",
  REJECTED: "Izin ditolak. Lihat alasannya di bawah, atau hubungi wali kelas.",
};

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
    <div className="w-full max-w-xl mx-auto">
      <h1 className="text-2xl sm:text-[2rem] leading-tight font-semibold">
        Lacak status pengajuan
      </h1>
      <p className="mt-3 text-muted">
        Masukkan kode tiket yang muncul setelah Anda mengirim pengajuan izin.
      </p>

      <form onSubmit={handleTrack} className="card mt-6 p-4 sm:p-6" role="search">
        <label htmlFor="ticketCode" className="label">
          Kode tiket
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
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
            placeholder="IZS-XXXXXXXX"
            className="field font-mono tracking-wide sm:flex-1"
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Mencari..." : "Cek status"}
          </button>
        </div>
        {error && (
          <p role="alert" className="alert-bad mt-3">
            {error}
          </p>
        )}
      </form>

      <div aria-live="polite">
        {result && (
          <article className="card mt-4 overflow-hidden">
            <div className="p-5 sm:p-6">
              <p className="hint">Pengajuan izin untuk</p>
              <h2 className="text-xl font-semibold mt-0.5">{result.studentName}</h2>
              <dl className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted">Jenis izin</dt>
                  <dd className="font-medium">{leaveTypeLabel(result.leaveType)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Diajukan</dt>
                  <dd className="font-medium">{formatDate(result.submittedAt)}</dd>
                </div>
                <div className="min-[420px]:col-span-2">
                  <dt className="text-muted">Tanggal izin</dt>
                  <dd className="font-medium">
                    {formatDate(result.startDate)} sampai {formatDate(result.endDate)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="tear" aria-hidden="true" />

            <div className="p-5 sm:p-6 bg-sunken">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusLabel status={result.status} size="lg" />
                <span className="font-mono text-sm text-muted">{result.ticketCode}</span>
              </div>
              <p className="mt-3 text-sm">{STATUS_NOTE[result.status]}</p>
              {result.status === "REJECTED" && result.rejectionReason && (
                <div className="alert-bad mt-3">
                  <p className="font-semibold">Alasan penolakan</p>
                  <p className="mt-1 text-ink">{result.rejectionReason}</p>
                </div>
              )}
            </div>
          </article>
        )}
      </div>

      <p className="mt-6 text-sm">
        Belum punya kode tiket?{" "}
        <Link href="/" className="link font-medium">
          Ajukan izin baru
        </Link>
      </p>
    </div>
  );
}

export default function LacakPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 w-full px-4 py-8 sm:py-12">
        <Suspense fallback={<p className="max-w-xl mx-auto text-muted">Memuat...</p>}>
          <TrackForm />
        </Suspense>
      </main>
    </>
  );
}
