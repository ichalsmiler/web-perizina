"use client";

import { useState } from "react";
import Link from "next/link";

type ImportError = { row: number; nis: string; reason: string };
type ImportResult = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: ImportError[];
};

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("Pilih file .xlsx terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/students/bulk-upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Gagal mengunggah file.");
        return;
      }
      setResult(json.data);
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/students"
        className="inline-flex items-center min-h-[44px] text-sm font-medium text-link"
      >
        &larr; Data siswa
      </Link>
      <h1 className="text-2xl font-semibold mt-1">Impor siswa dari Excel</h1>
      <p className="text-sm text-muted mt-1 mb-5">
        Baris dengan NIS yang sudah terdaftar akan dilewati dan dicatat di ringkasan.
      </p>

      <div className="card">
        <section className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Unduh dan isi template</h2>
          <p className="text-sm mt-2 leading-relaxed">
            Kolom: NIS, Nama Lengkap, Tingkat, Kelas. Kontak orang tua tidak perlu
            diisi di sini; lengkapi nanti lewat halaman ubah data siswa.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route */}
          <a href="/api/admin/students/template" className="btn btn-sm btn-secondary mt-4">
            Unduh template (.xlsx)
          </a>
        </section>

        <form onSubmit={handleUpload} className="p-5 sm:p-6 border-t border-line">
          <h2 className="text-lg font-semibold">Unggah file yang sudah diisi</h2>
          <label
            htmlFor="xlsx-file"
            className="mt-3 flex flex-col items-center justify-center gap-1 w-full border-2 border-dashed border-field rounded px-4 py-6 cursor-pointer text-center hover:bg-sunken transition-colors focus-within:outline focus-within:outline-3 focus-within:outline-focus"
          >
            <span className="text-sm font-semibold text-link">
              {file ? file.name : "Pilih file .xlsx"}
            </span>
            <span className="hint">{file ? "Ketuk untuk mengganti file" : "Hanya format Excel .xlsx"}</span>
            <input
              id="xlsx-file"
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
              className="sr-only"
            />
          </label>
          {error && (
            <p role="alert" className="alert-bad mt-3">
              {error}
            </p>
          )}
          <button type="submit" disabled={uploading} className="btn btn-primary mt-4">
            {uploading ? "Mengimpor..." : "Impor data siswa"}
          </button>
        </form>
      </div>

      <div aria-live="polite">
        {result && (
          <section className="card mt-4 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Hasil impor</h2>
            <p className="text-sm mt-2">
              {result.totalRows} baris dibaca:{" "}
              <strong className="text-ok-text">{result.successCount} berhasil</strong>,{" "}
              <strong className={result.failureCount ? "text-bad-text" : ""}>
                {result.failureCount} gagal
              </strong>
              .
            </p>
            {result.errors.length > 0 && (
              <div className="mt-4 overflow-x-auto border border-line rounded">
                <table className="w-full text-sm">
                  <thead className="bg-sunken text-left text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">Baris</th>
                      <th scope="col" className="px-3 py-2 font-semibold">NIS</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Alasan gagal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 tabular-nums">{e.row}</td>
                        <td className="px-3 py-2 font-mono">{e.nis || "kosong"}</td>
                        <td className="px-3 py-2">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link href="/admin/students" className="btn btn-sm btn-secondary mt-4">
              Lihat data siswa
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
