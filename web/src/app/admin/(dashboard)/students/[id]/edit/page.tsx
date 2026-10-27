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
      <Link
        href="/admin/students"
        className="inline-flex items-center min-h-[44px] text-sm font-medium text-link"
      >
        &larr; Data siswa
      </Link>
      {!student ? (
        <div role="alert" className="alert-bad mt-3">
          Data siswa tidak ditemukan. Mungkin tautannya salah.
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold mt-1">Ubah data siswa</h1>
          <p className="text-sm text-muted mt-1 mb-5">{student.fullName}</p>
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
        </>
      )}
    </div>
  );
}
