"use client";

import { useState } from "react";
import SelfieCapture from "@/components/SelfieCapture";
import { LEAVE_TYPES } from "@/lib/constants";

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
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const today = new Date().toISOString().slice(0, 10);

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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">
              Nama Orang Tua/Wali
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              value={parentWhatsapp}
              onChange={(e) =>
                setParentWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 12))
              }
              placeholder="08xxxxxxxxxx"
              className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Jenis Izin</label>
        <select
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
        >
          <option value="">Pilih jenis izin</option>
          {LEAVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">
            Tanggal Mulai
          </label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">
            Tanggal Selesai
          </label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          Catatan (opsional, maks 500 karakter)
        </label>
        <textarea
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          Dokumen Pendukung (PDF/JPG/PNG, maks 5MB)
        </label>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
        {document && (
          <p className="text-xs text-neutral-medium mt-1">
            Terpilih: {document.name}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          Verifikasi Selfie (wajib, langsung dari kamera)
        </label>
        <SelfieCapture onCapture={setSelfie} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-primary text-white rounded-md py-2.5 text-sm font-medium hover:bg-neutral-dark transition-colors disabled:opacity-60"
      >
        {submitting ? "Mengirim..." : "Kirim Pengajuan"}
      </button>
    </form>
  );
}
