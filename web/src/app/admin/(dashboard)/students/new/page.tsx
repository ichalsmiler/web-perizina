import Link from "next/link";
import StudentForm from "@/components/StudentForm";

export default function NewStudentPage() {
  return (
    <div>
      <Link
        href="/admin/students"
        className="inline-flex items-center min-h-[44px] text-sm font-medium text-link"
      >
        &larr; Data siswa
      </Link>
      <h1 className="text-2xl font-semibold mt-1 mb-5">Tambah siswa</h1>
      <StudentForm />
    </div>
  );
}
