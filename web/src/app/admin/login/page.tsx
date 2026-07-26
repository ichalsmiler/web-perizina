"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Invalid username or password.");
        return;
      }
      router.push(searchParams.get("next") || "/admin/dashboard");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-primary">IzinSiswa Admin</h1>
        <p className="text-sm text-neutral-medium mt-2">
          Masuk untuk mengelola data siswa dan permohonan izin.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm p-6 flex flex-col gap-3"
      >
        <div>
          <label className="text-sm font-medium block mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-neutral-medium rounded-md px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded-md py-2 text-sm font-medium hover:bg-neutral-dark transition-colors disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
