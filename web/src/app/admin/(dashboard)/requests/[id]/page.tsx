"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, leaveTypeLabel } from "@/lib/constants";

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
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/leave-requests/${id}`);
    const json = await res.json();
    if (!json.success) {
      setNotFound(true);
    } else {
      setDetail(json.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleApprove() {
    setActionError(null);
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/leave-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved" }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message ?? "Gagal memproses permohonan.");
        return;
      }
      await load();
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    setActionError(null);
    if (rejectReason.trim().length < 10) {
      setActionError("Alasan penolakan minimal 10 karakter.");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/leave-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejected", rejectionReason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message ?? "Gagal memproses permohonan.");
        return;
      }
      await load();
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-medium">Memuat...</p>;
  if (notFound || !detail)
    return (
      <div>
        <p className="text-danger text-sm mb-2">Permohonan tidak ditemukan.</p>
        <Link href="/admin/dashboard" className="text-secondary text-sm hover:underline">
          &larr; Kembali ke daftar
        </Link>
      </div>
    );

  const isPdf = detail.documentUrl?.toLowerCase().endsWith(".pdf");

  return (
    <div>
      <Link href="/admin/dashboard" className="text-sm text-secondary hover:underline">
        &larr; Kembali ke daftar
      </Link>

      <div className="bg-white rounded-lg shadow-sm p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold">{detail.student.fullName}</h1>
            <p className="text-xs text-neutral-medium">
              NIS {detail.student.nis} &middot; Kelas {detail.student.grade}{" "}
              {detail.student.class}
            </p>
          </div>
          <span className="font-mono text-xs bg-neutral-light px-2 py-1 rounded-md">
            {detail.ticketCode}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <dt className="text-xs text-neutral-medium">Jenis Izin</dt>
            <dd>{leaveTypeLabel(detail.leaveType)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-medium">Status</dt>
            <dd>{STATUS_LABELS[detail.status]}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-medium">Tanggal</dt>
            <dd>
              {formatDate(detail.startDate)} &ndash; {formatDate(detail.endDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-medium">Diajukan</dt>
            <dd>{formatDate(detail.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-medium">
              Nama Pengaju (Orang Tua/Wali)
            </dt>
            <dd className="font-medium">{detail.submitter.parentName}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-medium">
              WhatsApp Pengaju
            </dt>
            <dd className="font-medium">{detail.submitter.parentWhatsapp}</dd>
          </div>
          {(detail.student.parentName || detail.student.parentPhone) && (
            <div className="col-span-2 text-xs text-neutral-medium">
              Kontak terdaftar di data siswa: {detail.student.parentName ?? "-"}
              {detail.student.parentPhone ? ` · ${detail.student.parentPhone}` : ""}
            </div>
          )}
          {detail.reason && (
            <div className="col-span-2">
              <dt className="text-xs text-neutral-medium">Catatan</dt>
              <dd>{detail.reason}</dd>
            </div>
          )}
        </dl>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-neutral-medium mb-1">Dokumen Pendukung</p>
            {detail.documentUrl ? (
              isPdf ? (
                <embed
                  src={detail.documentUrl}
                  type="application/pdf"
                  className="w-full h-64 rounded-md border border-neutral-light"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.documentUrl}
                  alt="Dokumen pendukung"
                  className="w-full rounded-md border border-neutral-light"
                />
              )
            ) : (
              <p className="text-sm text-neutral-medium">Tidak ada dokumen.</p>
            )}
          </div>
          <div>
            <p className="text-xs text-neutral-medium mb-1">Selfie Verifikasi</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.selfieUrl}
              alt="Selfie verifikasi"
              className="w-full rounded-md border border-neutral-light"
            />
          </div>
        </div>

        {detail.status !== "PENDING" && (
          <div
            className={`rounded-md p-3 text-sm ${
              detail.status === "APPROVED"
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            Permohonan ini telah <strong>{STATUS_LABELS[detail.status]}</strong>
            {detail.processedBy ? ` oleh ${detail.processedBy}` : ""}.
            {detail.adminNotes && (
              <p className="mt-1">Alasan: {detail.adminNotes}</p>
            )}
          </div>
        )}

        {detail.status === "PENDING" && (
          <div className="border-t border-neutral-light pt-4">
            {actionError && (
              <p className="text-sm text-danger mb-3">{actionError}</p>
            )}
            {!showRejectForm ? (
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="bg-success text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  Setujui
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={processing}
                  className="bg-danger text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  Tolak
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Alasan Penolakan (10-250 karakter)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  maxLength={250}
                  rows={3}
                  className="border border-neutral-medium rounded-md px-3 py-2 text-sm"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={processing}
                    className="bg-danger text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    Konfirmasi Tolak
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    disabled={processing}
                    className="text-sm text-neutral-medium hover:underline"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
