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
    <div>
      <Link href="/admin/students" className="text-sm text-secondary hover:underline">
        &larr; Kembali ke daftar siswa
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-4">Upload Siswa via Excel</h1>

      <div className="bg-white rounded-lg shadow-sm p-6 max-w-lg flex flex-col gap-4">
        <div>
          <p className="text-sm mb-2">
            1. Unduh template, isi data siswa (NIS, Nama Lengkap, Tingkat,
            Kelas). Kontak orang tua tidak perlu diisi di sini — dapat
            dilengkapi belakangan di halaman Edit Siswa.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route */}
          <a
            href="/api/admin/students/template"
            className="inline-block text-sm bg-neutral-dark text-white rounded-md px-3 py-1.5 hover:bg-primary transition-colors"
          >
            Unduh Template (.xlsx)
          </a>
        </div>

        <form onSubmit={handleUpload} className="border-t border-neutral-light pt-4 flex flex-col gap-3">
          <p className="text-sm">2. Unggah file yang sudah diisi.</p>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="bg-primary text-white rounded-md py-2 text-sm font-medium hover:bg-neutral-dark transition-colors disabled:opacity-60 self-start px-6"
          >
            {uploading ? "Mengunggah..." : "Upload"}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-lg mt-4">
          <h2 className="font-semibold mb-2">Ringkasan Import</h2>
          <p className="text-sm mb-3">
            Total baris: {result.totalRows} &middot;{" "}
            <span className="text-success">{result.successCount} berhasil</span>{" "}
            &middot;{" "}
            <span className="text-danger">{result.failureCount} gagal</span>
          </p>
          {result.errors.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-medium border-b border-neutral-light">
                  <th className="py-1">Baris</th>
                  <th className="py-1">NIS</th>
                  <th className="py-1">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((e, i) => (
                  <tr key={i} className="border-b border-neutral-light last:border-0">
                    <td className="py-1">{e.row}</td>
                    <td className="py-1 font-mono text-xs">{e.nis || "-"}</td>
                    <td className="py-1 text-danger">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
