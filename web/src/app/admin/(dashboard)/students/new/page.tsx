import Link from "next/link";
import StudentForm from "@/components/StudentForm";

export default function NewStudentPage() {
  return (
    <div>
      <Link href="/admin/students" className="text-sm text-secondary hover:underline">
        &larr; Kembali ke daftar siswa
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-4">Tambah Siswa</h1>
      <StudentForm />
    </div>
  );
}
