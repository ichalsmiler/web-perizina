"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm bg-white/10 hover:bg-white/20 rounded-md px-3 py-1.5 transition-colors"
    >
      Keluar
    </button>
  );
}
