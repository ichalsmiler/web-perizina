import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

/** Kepala halaman publik (orang tua/wali). Nama aplikasi ditulis sebagai teks: belum ada logo resmi sekolah. */
export default function SiteHeader() {
  return (
    <header className="bg-chrome text-on-chrome">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between gap-2 min-h-[56px]">
        <Link
          href="/"
          className="font-heading font-semibold text-lg min-h-[44px] inline-flex items-center"
        >
          IzinSiswa
        </Link>
        <nav className="flex items-center gap-1" aria-label="Navigasi utama">
          <Link
            href="/lacak"
            className="inline-flex items-center min-h-[44px] px-3 rounded text-sm font-medium hover:bg-white/10"
          >
            Lacak status
          </Link>
          <ThemeToggle className="hover:bg-white/10" />
        </nav>
      </div>
    </header>
  );
}
