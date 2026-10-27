import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import SiteHeader from "@/components/SiteHeader";

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
      <>
        <SiteHeader />
        <main className="flex-1 w-full max-w-xl mx-auto px-4 py-12">
          <div className="card p-6">
            <h1 className="text-xl font-semibold">Siswa tidak ditemukan</h1>
            <p className="hint mt-2">
              Data siswa ini tidak ada atau sudah tidak aktif. Cari ulang dengan
              nama lengkap atau NIS.
            </p>
            <Link href="/" className="btn btn-primary mt-5">
              Cari siswa lagi
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center min-h-[44px] text-sm font-medium text-link"
        >
          &larr; Ganti siswa
        </Link>

        <h1 className="text-2xl sm:text-[2rem] leading-tight font-semibold mt-2">
          Pengajuan izin
        </h1>
        <div className="mt-3 mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-lg font-semibold text-heading">{student.fullName}</p>
          <p className="text-sm text-muted">
            Kelas {student.grade} {student.class} &middot; NIS {student.nis}
          </p>
        </div>

        <LeaveRequestForm
          student={{
            id: student.id,
            fullName: student.fullName,
          }}
        />
      </main>
    </>
  );
}
