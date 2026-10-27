"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, leaveTypeLabel } from "@/lib/constants";
import StatusLabel from "@/components/StatusLabel";

type Detail = {
  id: string;
  ticketCode: string;
  student: {
    fullName: string;
    nis: string;
    grade: string;
    class: string;
    parentName: string | null;
    parentPhone: string | null;
    parentEmail: string | null;
  };
  submitter: {
    parentName: string;
    parentWhatsapp: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  documentUrl: string | null;
  selfieUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  processedBy: string | null;
  submittedAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function BackLink() {
  return (
    <Link
      href="/admin/dashboard"
      className="inline-flex items-center min-h-[44px] text-sm font-medium text-link"
    >
      &larr; Daftar permohonan
    </Link>
  );
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadState, setLoadState] = useState<"ok" | "notFound" | "error">("ok");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const rejectRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leave-requests/${id}`);
      const json = await res.json();
      if (!json.success) {
        setLoadState("notFound");
      } else {
        setDetail(json.data);
        setLoadState("ok");
      }
    } catch {
      setLoadState("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(body: object) {
    setActionError(null);
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/leave-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message ?? "Gagal memproses permohonan.");
        return;
      }
      setShowRejectForm(false);
      await load();
    } catch {
      setActionError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setProcessing(false);
    }
  }

  function handleReject() {
    if (rejectReason.trim().length < 10) {
      setActionError("Alasan penolakan minimal 10 karakter.");
      rejectRef.current?.focus();
      return;
    }
    updateStatus({ status: "Rejected", rejectionReason: rejectReason.trim() });
  }

  if (loading && !detail) {
    return (
      <div>
        <BackLink />
        <p className="card p-5 mt-3 text-muted" aria-busy="true">
          Memuat permohonan...
        </p>
      </div>
    );
  }

  if (loadState !== "ok" || !detail) {
    return (
      <div>
        <BackLink />
        <div role="alert" className="alert-bad mt-3 flex flex-wrap items-center justify-between gap-3">
          <span>
            {loadState === "notFound"
              ? "Permohonan ini tidak ditemukan. Mungkin tautannya salah."
              : "Permohonan gagal dimuat. Periksa koneksi ke server."}
          </span>
          {loadState === "error" && (
            <button type="button" onClick={load} className="btn btn-sm btn-secondary">
              Muat ulang
            </button>
          )}
        </div>
      </div>
    );
  }

  const isPdf = detail.documentUrl?.toLowerCase().endsWith(".pdf");
  const registeredParent = detail.student.parentName || detail.student.parentPhone;

  return (
    <div>
      <BackLink />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{detail.student.fullName}</h1>
          <p className="text-sm text-muted mt-1">
            Kelas {detail.student.grade} {detail.student.class} &middot; NIS {detail.student.nis}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <StatusLabel status={detail.status} size="lg" />
          <span className="font-mono text-sm text-muted">{detail.ticketCode}</span>
        </div>
      </div>

      <div className="grid gap-4 mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
        <section className="card" aria-labelledby="h-info">
          <h2 id="h-info" className="sr-only">
            Rincian permohonan
          </h2>
          <dl className="p-5 grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div className="min-[420px]:col-span-2">
              <dt className="text-muted">Tanggal izin</dt>
              <dd className="text-base font-semibold text-heading mt-0.5">
                {formatDate(detail.startDate)}
                {detail.startDate.slice(0, 10) !== detail.endDate.slice(0, 10) && (
                  <> sampai {formatDate(detail.endDate)}</>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Jenis izin</dt>
              <dd className="font-medium mt-0.5">{leaveTypeLabel(detail.leaveType)}</dd>
            </div>
            <div>
              <dt className="text-muted">Diajukan</dt>
              <dd className="font-medium mt-0.5">{formatDate(detail.submittedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted">Pengaju</dt>
              <dd className="font-medium mt-0.5">{detail.submitter.parentName}</dd>
            </div>
            <div>
              <dt className="text-muted">WhatsApp pengaju</dt>
              <dd className="font-medium font-mono mt-0.5">{detail.submitter.parentWhatsapp}</dd>
            </div>
            <div className="min-[420px]:col-span-2">
              <dt className="text-muted">Kontak terdaftar di data siswa</dt>
              <dd className="mt-0.5">
                {registeredParent ? (
                  <>
                    {detail.student.parentName ?? "Nama belum diisi"}
                    {detail.student.parentPhone && (
                      <span className="font-mono">, {detail.student.parentPhone}</span>
                    )}
                  </>
                ) : (
                  <span className="text-muted">Belum diisi, tidak bisa dibandingkan.</span>
                )}
              </dd>
            </div>
            <div className="min-[420px]:col-span-2">
              <dt className="text-muted">Catatan orang tua</dt>
              <dd className="mt-0.5 whitespace-pre-line">
                {detail.reason || <span className="text-muted">Tidak ada catatan.</span>}
              </dd>
            </div>
          </dl>

          <div className="tear" aria-hidden="true" />

          <div className="p-5 bg-sunken rounded-b-[8px]">
            {detail.status !== "PENDING" ? (
              <div className="text-sm">
                <p>
                  Permohonan ini sudah <strong>{STATUS_LABELS[detail.status].toLowerCase()}</strong>
                  {detail.processedBy ? ` oleh ${detail.processedBy}` : ""}.
                </p>
                {detail.adminNotes && (
                  <p className="mt-2">
                    <span className="text-muted">Alasan: </span>
                    {detail.adminNotes}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-base font-semibold mb-3">Keputusan</h2>
                {actionError && (
                  <p role="alert" className="alert-bad mb-3">
                    {actionError}
                  </p>
                )}
                {!showRejectForm ? (
                  <div className="flex flex-col min-[420px]:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => updateStatus({ status: "Approved" })}
                      disabled={processing}
                      className="btn btn-ok"
                    >
                      {processing ? "Memproses..." : "Setujui izin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setShowRejectForm(true);
                        requestAnimationFrame(() => rejectRef.current?.focus());
                      }}
                      disabled={processing}
                      className="btn btn-bad-outline"
                    >
                      Tolak
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col gap-2"
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && !processing) setShowRejectForm(false);
                    }}
                  >
                    <label htmlFor="reject-reason" className="label mb-0">
                      Alasan penolakan
                    </label>
                    <p className="hint">Dibaca orang tua di halaman lacak status. 10 sampai 250 karakter.</p>
                    <textarea
                      id="reject-reason"
                      ref={rejectRef}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={250}
                      rows={3}
                      className="field"
                    />
                    <p className="hint text-right">{rejectReason.trim().length}/250</p>
                    <div className="flex flex-col min-[420px]:flex-row gap-3">
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={processing}
                        className="btn btn-bad"
                      >
                        {processing ? "Memproses..." : "Tolak permohonan"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        disabled={processing}
                        className="btn btn-secondary"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="h-bukti" className="flex flex-col gap-4">
          <h2 id="h-bukti" className="sr-only">
            Bukti pengajuan
          </h2>
          <figure className="card p-4">
            <figcaption className="flex items-center justify-between gap-2 mb-3">
              <span className="font-semibold text-heading">Foto verifikasi pengaju</span>
              <a href={detail.selfieUrl} target="_blank" rel="noreferrer" className="link text-sm">
                Buka ukuran penuh
              </a>
            </figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.selfieUrl}
              alt={`Foto verifikasi ${detail.submitter.parentName}`}
              className="w-full max-h-[420px] object-contain rounded bg-sunken"
            />
          </figure>

          <figure className="card p-4">
            <figcaption className="flex items-center justify-between gap-2 mb-3">
              <span className="font-semibold text-heading">Dokumen pendukung</span>
              {detail.documentUrl && (
                <a href={detail.documentUrl} target="_blank" rel="noreferrer" className="link text-sm">
                  Buka di tab baru
                </a>
              )}
            </figcaption>
            {detail.documentUrl ? (
              isPdf ? (
                <embed
                  src={detail.documentUrl}
                  type="application/pdf"
                  className="w-full h-80 rounded border border-line"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.documentUrl}
                  alt="Dokumen pendukung"
                  className="w-full max-h-[480px] object-contain rounded bg-sunken"
                />
              )
            ) : (
              <p className="text-sm text-muted">Orang tua tidak melampirkan dokumen.</p>
            )}
          </figure>
        </section>
      </div>
    </div>
  );
}
