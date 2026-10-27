"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import SelfieCapture from "@/components/SelfieCapture";
import {
  ALLOWED_DOCUMENT_TYPES,
  ATTACHMENT_RETENTION_DAYS,
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

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="p-4 sm:p-6 border-t border-line first:border-t-0">
      <legend className="sr-only">{title}</legend>
      <h2 className="flex items-baseline gap-3 text-lg font-semibold mb-4" aria-hidden="true">
        <span className="text-sm tabular-nums text-muted">{step}/4</span>
        {title}
      </h2>
      {children}
    </fieldset>
  );
}

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
  const errorRef = useRef<HTMLParagraphElement>(null);

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

  function fail(message: string) {
    setError(message);
    // Pesan ada di bawah form panjang; arahkan pandangan ke sana.
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!parentName.trim() || !parentWhatsapp.trim()) {
      fail("Lengkapi nama dan nomor WhatsApp orang tua/wali (bagian 1).");
      return;
    }
    if (!/^\d{9,12}$/.test(parentWhatsapp)) {
      fail("Nomor WhatsApp harus berupa angka, 9 sampai 12 digit (bagian 1).");
      return;
    }
    if (!leaveType || !startDate || !endDate) {
      fail("Pilih jenis izin dan isi tanggal mulai serta selesai (bagian 2).");
      return;
    }
    if (endDate < startDate) {
      fail("Tanggal selesai tidak boleh sebelum tanggal mulai (bagian 2).");
      return;
    }
    if (!selfie) {
      fail("Ambil foto verifikasi wajah sebelum mengirim (bagian 3).");
      return;
    }
    if (!agreedToStatement) {
      fail("Centang pernyataan sebelum mengirim pengajuan (bagian 4).");
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
        fail(json.error?.message ?? "Gagal mengirim pengajuan.");
        return;
      }
      setResult(json.data);
      window.scrollTo({ top: 0 });
    } catch {
      fail("Pengajuan gagal terkirim. Periksa koneksi internet, lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <TicketSlip result={result} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card">
      <Section step={1} title="Data orang tua/wali">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="parent-name" className="label">
              Nama orang tua/wali
            </label>
            <input
              id="parent-name"
              type="text"
              autoComplete="name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Nama lengkap Anda"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="parent-wa" className="label">
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
              aria-describedby="parent-wa-hint"
              className="field font-mono"
            />
            <p id="parent-wa-hint" className="hint mt-1">
              Angka saja, 9 sampai 12 digit.
            </p>
          </div>
        </div>
      </Section>

      <Section step={2} title="Jenis dan tanggal izin">
        <div role="radiogroup" aria-labelledby="leave-type-label">
          <p id="leave-type-label" className="label">
            Jenis izin
          </p>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
            {LEAVE_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-center gap-3 min-h-[48px] px-3 rounded border cursor-pointer transition-colors ${
                  leaveType === t.value
                    ? "border-brand bg-sunken font-semibold text-heading"
                    : "border-field hover:bg-sunken"
                }`}
              >
                <input
                  type="radio"
                  name="leave-type"
                  value={t.value}
                  checked={leaveType === t.value}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-5 h-5 flex-none accent-[var(--brand)]"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 mt-5">
          <div>
            <label htmlFor="start-date" className="label">
              Tanggal mulai
            </label>
            <input
              id="start-date"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="label">
              Tanggal selesai
            </label>
            <input
              id="end-date"
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field"
            />
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="reason" className="label">
            Catatan <span className="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Misalnya: demam sejak semalam, kontrol ke dokter"
            className="field"
          />
          <p className="hint mt-1 text-right">{reason.length}/500</p>
        </div>
      </Section>

      <Section step={3} title="Dokumen dan foto">
        <div>
          <p className="label">
            Dokumen pendukung{" "}
            <span className="font-normal text-muted">(opsional)</span>
          </p>
          <p className="hint mb-2">
            Surat keterangan dokter atau surat resmi. PDF, JPG, atau PNG,
            maksimal 5MB.
          </p>

          {!document ? (
            <>
              <label
                htmlFor="dokumen-pendukung"
                className="flex flex-col items-center justify-center gap-1 w-full border-2 border-dashed border-field rounded px-4 py-6 cursor-pointer text-center hover:bg-sunken transition-colors focus-within:outline focus-within:outline-3 focus-within:outline-focus"
              >
                <span className="text-sm font-semibold text-link">
                  Pilih file dokumen
                </span>
                <span className="hint">Ketuk untuk membuka galeri atau file</span>
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
            <div className="flex items-center gap-3 w-full border border-field rounded px-3 py-3 bg-sunken">
              <span
                className="flex-none w-11 h-11 rounded bg-surface border border-line grid place-items-center text-[11px] font-mono font-semibold text-heading"
                aria-hidden="true"
              >
                {document.type === "application/pdf" ? "PDF" : "IMG"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-heading truncate">
                  {document.name}
                </span>
                <span className="block hint">
                  {formatFileSize(document.size)}, siap dikirim
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setDocument(null);
                  setDocumentError(null);
                }}
                className="btn btn-sm btn-bad-outline flex-none"
              >
                Hapus
              </button>
            </div>
          )}

          {documentError && (
            <p role="alert" className="alert-bad mt-2">
              {documentError}
            </p>
          )}
        </div>

        <div className="mt-6">
          <p className="label">
            Foto verifikasi wajah <span className="text-bad-text">(wajib)</span>
          </p>
          <p className="hint mb-2">
            Foto wajah orang tua/wali yang mengajukan. Dipakai sekolah untuk
            memastikan pengajuan ini benar dari Anda. Foto dan dokumen hanya
            disimpan {ATTACHMENT_RETENTION_DAYS} hari, lalu dihapus otomatis.
          </p>
          <SelfieCapture onCapture={setSelfie} />
        </div>
      </Section>

      <Section step={4} title="Pernyataan dan kirim">
        <label className="flex items-start gap-3 text-sm bg-sunken border border-line rounded p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToStatement}
            onChange={(e) => setAgreedToStatement(e.target.checked)}
            className="mt-0.5 flex-none w-5 h-5 accent-[var(--brand)]"
          />
          <span className="leading-relaxed">
            Saya menyatakan dengan sebenar-benarnya bahwa anak saya{" "}
            <strong className="text-heading">{student.fullName}</strong>{" "}
            berhalangan mengikuti kegiatan belajar sekolah karena alasan di
            atas. Data yang saya isikan sah dan dapat dipertanggungjawabkan.
          </span>
        </label>

        {error && (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="alert-bad mt-4"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full mt-4 min-h-[52px]"
        >
          {submitting ? "Mengirim pengajuan..." : "Kirim pengajuan izin"}
        </button>
      </Section>
    </form>
  );
}

function TicketSlip({ result }: { result: SubmitResult }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "manual">("idle");
  const codeRef = useRef<HTMLInputElement>(null);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.ticketCode);
      setCopied("ok");
    } catch {
      // Clipboard API butuh HTTPS; di HTTP lokal pilih teksnya agar bisa disalin manual.
      codeRef.current?.select();
      setCopied("manual");
    }
  }

  return (
    <div className="card overflow-hidden" role="status">
      <div className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Pengajuan terkirim</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Izin untuk <strong className="text-heading">{result.studentName}</strong>{" "}
          sudah diterima sekolah dan menunggu persetujuan admin.
        </p>
      </div>

      <div className="tear" aria-hidden="true" />

      <div className="p-5 sm:p-6 bg-sunken">
        <label htmlFor="ticket-code" className="label">
          Kode tiket Anda
        </label>
        <div className="flex flex-col min-[420px]:flex-row gap-2">
          <input
            id="ticket-code"
            ref={codeRef}
            readOnly
            value={result.ticketCode}
            onFocus={(e) => e.target.select()}
            className="field font-mono text-xl font-semibold tracking-wide text-heading min-[420px]:flex-1"
          />
          <button type="button" onClick={copyCode} className="btn btn-secondary">
            {copied === "ok" ? "Tersalin" : "Salin kode"}
          </button>
        </div>
        <p className="hint mt-2" aria-live="polite">
          {copied === "manual"
            ? "Browser tidak mengizinkan salin otomatis. Kode sudah dipilih, tekan lama lalu pilih Salin."
            : "Simpan kode ini, misalnya dengan tangkapan layar. Tanpa kode, status pengajuan tidak bisa dibuka lagi."}
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <a
            href={`/lacak?ticketCode=${encodeURIComponent(result.ticketCode)}`}
            className="btn btn-primary"
          >
            Lacak status pengajuan
          </a>
          <Link href="/" className="btn btn-secondary">
            Ajukan untuk siswa lain
          </Link>
        </div>
      </div>
    </div>
  );
}
