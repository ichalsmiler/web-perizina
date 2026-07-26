"use client";

import { useState } from "react";
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
      setError("NIS, Nama Lengkap, Tingkat, dan Kelas wajib diisi.");
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-sm p-6 flex flex-col gap-4 max-w-lg"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">NIS</label>
          <input
            value={values.nis}
            onChange={(e) => update("nis", e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Nama Lengkap</label>
          <input
            value={values.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Tingkat</label>
          <input
            value={values.grade}
            onChange={(e) => update("grade", e.target.value)}
            placeholder="Contoh: 10"
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Kelas</label>
          <input
            value={values.class}
            onChange={(e) => update("class", e.target.value)}
            placeholder="Contoh: IPA 1"
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="border-t border-neutral-light pt-4">
        <p className="text-xs text-neutral-medium mb-3">
          Kontak Orang Tua/Wali (opsional, dapat dilengkapi belakangan)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Nama Ortu</label>
            <input
              value={values.parentName}
              onChange={(e) => update("parentName", e.target.value)}
              className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">No. HP Ortu</label>
            <input
              value={values.parentPhone}
              onChange={(e) => update("parentPhone", e.target.value)}
              className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium block mb-1">
              Email Ortu (opsional)
            </label>
            <input
              type="email"
              value={values.parentEmail}
              onChange={(e) => update("parentEmail", e.target.value)}
              className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-primary text-white rounded-md py-2 text-sm font-medium hover:bg-neutral-dark transition-colors disabled:opacity-60 self-start px-6"
      >
        {saving ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
