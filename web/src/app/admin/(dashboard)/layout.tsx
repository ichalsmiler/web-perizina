import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import AdminNav from "@/components/AdminNav";
import ThemeToggle from "@/components/ThemeToggle";

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
      <header className="bg-chrome text-on-chrome">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/admin/dashboard"
            className="font-heading font-semibold text-lg min-h-[48px] inline-flex items-center self-start sm:self-auto"
          >
            IzinSiswa
            <span className="ml-2 text-sm font-sans font-medium opacity-85">Admin</span>
          </Link>
          {/* Di HP: nama admin, tema, dan keluar dalam satu baris ringkas di atas menu. */}
          <div className="flex sm:hidden items-center justify-between gap-1">
            <span className="text-sm opacity-85 truncate">{session.fullName}</span>
            <span className="flex items-center">
              <ThemeToggle className="hover:bg-white/10" />
              <LogoutButton />
            </span>
          </div>
          <div className="-mx-4 sm:mx-0 border-t border-white/15 sm:border-0">
            <AdminNav />
          </div>
          <div className="hidden sm:flex sm:ml-auto items-center gap-1">
            <span className="text-sm opacity-85 px-2">{session.fullName}</span>
            <ThemeToggle className="hover:bg-white/10" />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
