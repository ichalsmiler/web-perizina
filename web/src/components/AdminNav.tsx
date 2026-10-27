"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/dashboard", match: ["/admin/dashboard", "/admin/requests"], label: "Permohonan izin" },
  { href: "/admin/students", match: ["/admin/students"], label: "Data siswa" },
  { href: "/admin/settings", match: ["/admin/settings"], label: "Pengaturan" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu admin" className="flex">
      {ITEMS.map((item) => {
        const active = item.match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center min-h-[48px] px-2 sm:px-4 text-sm text-center font-semibold border-b-[3px] transition-colors ${
              active
                ? "border-on-chrome"
                : "border-transparent opacity-85 hover:opacity-100 hover:border-white/40"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
