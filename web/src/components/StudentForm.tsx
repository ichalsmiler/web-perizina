"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type StudentFormValues = {
  nis: string;
  fullName: string;
  grade: string;
  class: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
};

type Props = {
  initialValues?: Partial<StudentFormValues>;
  studentId?: string;
};

type FieldProps = {
  id: keyof StudentFormValues;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
  mono?: boolean;
  className?: string;
};

function Field({ id, label, value, onChange, placeholder, type = "text", inputMode, required, mono, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={`sf-${id}`} className="label">
        {label}
        {required && <span className="text-bad-text"> *</span>}
      </label>
      <input
        id={`sf-${id}`}
        type={type}
        inputMode={inputMode}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`field ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

export default function StudentForm({ initialValues, studentId }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<StudentFormValues>({
    nis: initialValues?.nis ?? "",
    fullName: initialValues?.fullName ?? "",
    grade: initialValues?.grade ?? "",
    class: initialValues?.class ?? "",
    parentName: initialValues?.parentName ?? "",
    parentPhone: initialValues?.parentPhone ?? "",
    parentEmail: initialValues?.parentEmail ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof StudentFormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.nis || !values.fullName || !values.grade || !values.class) {
      setError("NIS, nama lengkap, tingkat, dan kelas wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const url = studentId
        ? `/api/admin/students/${studentId}`
        : "/api/admin/students";
      const res = await fetch(url, {
        method: studentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Gagal menyimpan data siswa.");
        return;
      }
      router.push("/admin/students");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card max-w-2xl">
      <fieldset className="p-5 sm:p-6">
        <legend className="sr-only">Data siswa</legend>
        <h2 className="text-lg font-semibold mb-4" aria-hidden="true">
          Data siswa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="fullName" label="Nama lengkap" required value={values.fullName} onChange={(v) => update("fullName", v)} className="sm:col-span-2" />
          <Field id="nis" label="NIS" required mono inputMode="numeric" value={values.nis} onChange={(v) => update("nis", v)} />
          <div className="grid grid-cols-2 gap-4">
            <Field id="grade" label="Tingkat" required inputMode="numeric" value={values.grade} onChange={(v) => update("grade", v)} placeholder="Contoh: 10" />
            <Field id="class" label="Kelas" required value={values.class} onChange={(v) => update("class", v)} placeholder="Contoh: IPA 1" />
          </div>
        </div>
      </fieldset>

      <fieldset className="p-5 sm:p-6 border-t border-line">
        <legend className="sr-only">Kontak orang tua/wali</legend>
        <h2 className="text-lg font-semibold" aria-hidden="true">
          Kontak orang tua/wali
        </h2>
        <p className="hint mt-1 mb-4">
          Opsional. Dipakai admin untuk membandingkan dengan data pengaju izin.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="parentName" label="Nama orang tua/wali" value={values.parentName} onChange={(v) => update("parentName", v)} />
          <Field id="parentPhone" label="Nomor HP" type="tel" inputMode="tel" mono value={values.parentPhone} onChange={(v) => update("parentPhone", v)} />
          <Field id="parentEmail" label="Email" type="email" value={values.parentEmail} onChange={(v) => update("parentEmail", v)} className="sm:col-span-2" />
        </div>
      </fieldset>

      <div className="p-5 sm:p-6 border-t border-line bg-sunken rounded-b-[8px]">
        {error && (
          <p role="alert" className="alert-bad mb-4">
            {error}
          </p>
        )}
        <div className="flex flex-col min-[420px]:flex-row gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Menyimpan..." : studentId ? "Simpan perubahan" : "Simpan siswa"}
          </button>
          <Link href="/admin/students" className="btn btn-secondary">
            Batal
          </Link>
        </div>
      </div>
    </form>
  );
}
