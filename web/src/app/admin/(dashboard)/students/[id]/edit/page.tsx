import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StudentForm from "@/components/StudentForm";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id } });

  return (
    <div>
      <Link href="/admin/students" className="text-sm text-secondary hover:underline">
        &larr; Kembali ke daftar siswa
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-4">Edit Siswa</h1>
      {!student ? (
        <p className="text-danger text-sm">Data siswa tidak ditemukan.</p>
      ) : (
        <StudentForm
          studentId={student.id}
          initialValues={{
            nis: student.nis,
            fullName: student.fullName,
            grade: student.grade,
            class: student.class,
            parentName: student.parentName ?? "",
            parentPhone: student.parentPhone ?? "",
            parentEmail: student.parentEmail ?? "",
          }}
        />
      )}
    </div>
  );
}
