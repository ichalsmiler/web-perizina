import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LeaveRequestForm from "@/components/LeaveRequestForm";

export default async function AjukanPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student || !student.isActive) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-danger font-medium mb-2">Siswa tidak ditemukan.</p>
        <Link href="/" className="text-secondary hover:underline text-sm">
          Kembali ke pencarian
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] text-sm text-secondary hover:underline"
          >
            &larr; Cari siswa lain
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{student.fullName}</p>
            <p className="text-xs text-neutral-medium">
              NIS {student.nis} &middot; Kelas {student.grade} {student.class}
            </p>
          </div>
          <span className="flex-none text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
            &#10003; Terverifikasi
          </span>
        </div>

        <LeaveRequestForm
          student={{
            id: student.id,
            fullName: student.fullName,
          }}
        />
      </div>
    </main>
  );
}
