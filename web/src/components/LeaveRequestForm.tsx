"use client";

import { useState } from "react";
import SelfieCapture from "@/components/SelfieCapture";
import {
  ALLOWED_DOCUMENT_TYPES,
  LEAVE_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/lib/constants";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  student: { id: string; fullName: string };
};

type SubmitResult = {
  ticketCode: string;
  studentName: string;
  status: string;
};

export default function LeaveRequestForm({ student }: Props) {
  const [parentName, setParentName] = useState("");
  const [parentWhatsapp, setParentWhatsapp] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [agreedToStatement, setAgreedToStatement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  function handleDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    // Input di-reset agar file yang sama bisa dipilih ulang setelah dihapus.
    e.target.value = "";

    if (!file) return;

    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setDocument(null);
      setDocumentError(
        "Format file tidak didukung. Gunakan PDF, JPG, atau PNG."
      );
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setDocument(null);
      setDocumentError(
        `Ukuran file ${formatFileSize(file.size)} melebihi batas 5MB.`
      );
      return;
    }

    setDocumentError(null);
    setDocument(file);
  }

  const isWhatsappValid = /^\d{9,12}$/.test(parentWhatsapp);
  const isDateRangeValid = !!startDate && !!endDate && endDate >= startDate;
  const isFormComplete =
    !!parentName.trim() &&
    isWhatsappValid &&
    !!leaveType &&
    isDateRangeValid &&
    !!selfie &&
    agreedToStatement;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!parentName.trim() || !parentWhatsapp.trim()) {
      setError("Mohon lengkapi nama dan nomor WhatsApp orang tua/wali.");
      return;
    }
    if (!/^\d{9,12}$/.test(parentWhatsapp)) {
      setError("Nomor WhatsApp harus berupa angka, 9-12 digit.");
      return;
    }
    if (!leaveType || !startDate || !endDate) {
      setError("Mohon lengkapi jenis izin dan rentang tanggal.");
      return;
    }
    if (endDate < startDate) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (!selfie) {
      setError("Selfie verifikasi wajib diambil sebelum mengirim.");
      return;
    }
    if (!agreedToStatement) {
      setError("Mohon centang pernyataan sebelum mengirim pengajuan.");
      return;
    }

    const formData = new FormData();
    formData.set("studentId", student.id);
    formData.set("parentName", parentName.trim());
    formData.set("parentWhatsapp", parentWhatsapp.trim());
    formData.set("leaveType", leaveType);
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    if (reason) formData.set("reason", reason);
    if (document) formData.set("document", document);
    formData.set("selfie", selfie);

    setSubmitting(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Gagal mengirim pengajuan.");
        return;
      }
      setResult(json.data);
    } catch {
      setError(
        "Submission failed. Please check your internet connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-success text-3xl mb-2">&#10003;</p>
        <h2 className="font-semibold text-lg mb-1">Pengajuan Terkirim</h2>
        <p className="text-sm text-neutral-medium mb-4">
          Izin untuk {result.studentName} telah diajukan dengan status{" "}
          <strong>Pending</strong>.
        </p>
        <div className="bg-neutral-light rounded-md p-4 mb-4">
          <p className="text-xs text-neutral-medium mb-1">Kode Tiket Anda</p>
          <p className="font-mono text-xl font-semibold text-primary">
            {result.ticketCode}
          </p>
        </div>
        <p className="text-xs text-neutral-medium mb-4">
          Simpan kode ini untuk melacak status pengajuan. Tanpa kode ini,
          status tidak dapat diakses kembali.
        </p>
        <a
          href={`/lacak?ticketCode=${encodeURIComponent(result.ticketCode)}`}
          className="inline-block bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-neutral-dark transition-colors"
        >
          Lacak Status Sekarang
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-sm p-6 flex flex-col gap-5"
    >
      <div className="border-b border-neutral-light pb-5">
        <p className="text-xs text-neutral-medium mb-3">
          Data Orang Tua/Wali yang Mengajukan
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="parent-name" className="text-sm font-medium block mb-1">
              Nama Orang Tua/Wali
            </label>
            <input
              id="parent-name"
              type="text"
              autoComplete="name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full border border-neutral-medium rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label htmlFor="parent-wa" className="text-sm font-medium block mb-1">
              Nomor WhatsApp
            </label>
            <input
              id="parent-wa"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pattern="[0-9]*"
              maxLength={12}
              value={parentWhatsapp}
              onChange={(e) =>
                setParentWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 12))
              }
              placeholder="08xxxxxxxxxx"
              className="w-full border border-neutral-medium rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="leave-type" className="text-sm font-medium block mb-1">
          Jenis Izin
        </label>
        <select
          id="leave-type"
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          className="w-full border border-neutral-medium rounded-md px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">Pilih jenis izin</option>
          {LEAVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start-date" className="text-sm font-medium block mb-1">
            Tanggal Mulai
          </label>
          <input
            id="start-date"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="text-sm font-medium block mb-1">
            Tanggal Selesai
          </label>
          <input
            id="end-date"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="text-sm font-medium block mb-1">
          Catatan{" "}
          <span className="font-normal text-neutral-medium">(opsional)</span>
        </label>
        <textarea
          id="reason"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Keterangan tambahan bila perlu"
          className="w-full border border-neutral-medium rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          Dokumen Pendukung{" "}
          <span className="font-normal text-neutral-medium">(opsional)</span>
        </label>
        <p className="text-xs text-neutral-medium mb-2">
          Contoh: surat keterangan dokter atau surat resmi. Format PDF, JPG,
          atau PNG — ukuran maksimal 5MB.
        </p>

        {!document ? (
          <>
            <label
              htmlFor="dokumen-pendukung"
              className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-neutral-medium rounded-lg px-4 py-6 cursor-pointer text-center hover:border-secondary hover:bg-neutral-light/50 transition-colors"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-secondary"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-sm font-medium text-primary">
                Ketuk untuk pilih file
              </span>
              <span className="text-xs text-neutral-medium">
                PDF, JPG, atau PNG · maks 5MB
              </span>
            </label>
            <input
              id="dokumen-pendukung"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={handleDocumentChange}
              className="sr-only"
            />
          </>
        ) : (
          <div className="flex items-center gap-3 w-full border border-neutral-medium rounded-lg px-3 py-3 bg-neutral-light/60">
            <span
              className="flex-none w-10 h-10 rounded-md bg-white border border-neutral-medium grid place-items-center text-[10px] font-semibold text-primary"
              aria-hidden="true"
            >
              {document.type === "application/pdf" ? "PDF" : "IMG"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-primary truncate">
                {document.name}
              </span>
              <span className="block text-xs text-neutral-medium">
                {formatFileSize(document.size)} · siap dikirim
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setDocument(null);
                setDocumentError(null);
              }}
              className="flex-none text-xs font-medium text-danger border border-danger/40 rounded-md px-3 py-2 hover:bg-danger hover:text-white transition-colors"
            >
              Hapus
            </button>
          </div>
        )}

        {documentError && (
          <p className="text-xs text-danger mt-2">{documentError}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          Verifikasi Selfie (wajib, langsung dari kamera)
        </label>
        <SelfieCapture onCapture={setSelfie} />
      </div>

      <label className="flex items-start gap-3 text-xs text-neutral-dark bg-neutral-light rounded-md p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedToStatement}
          onChange={(e) => setAgreedToStatement(e.target.checked)}
          className="mt-0.5 flex-none w-5 h-5"
        />
        <span className="leading-relaxed">
          Saya menyatakan dengan sebenar-benarnya bahwa anak saya tersebut di
          atas berhalangan mengikuti kegiatan belajar sekolah dikarenakan
          alasan tersebut. Data yang diisikan adalah sah dan dapat
          dipertanggungjawabkan.
        </span>
      </label>

      {error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !isFormComplete}
        className="bg-primary text-white rounded-md py-3.5 text-base font-medium hover:bg-neutral-dark active:bg-neutral-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Mengirim..." : "Kirim Pengajuan"}
      </button>
    </form>
  );
}
