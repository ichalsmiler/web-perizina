import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-primary text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-6">
            <span className="font-semibold">IzinSiswa Admin</span>
            <Link href="/admin/dashboard" className="text-sm hover:underline">
              Permohonan Izin
            </Link>
            <Link href="/admin/students" className="text-sm hover:underline">
              Data Siswa
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-light">{session.fullName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
