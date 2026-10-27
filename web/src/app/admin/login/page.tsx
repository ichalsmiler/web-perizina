"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

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
        setError(json.error?.message ?? "Username atau password salah.");
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
      <p className="font-heading font-semibold text-lg text-heading">IzinSiswa</p>
      <h1 className="text-2xl font-semibold mt-1">Masuk admin sekolah</h1>
      <p className="mt-2 text-sm text-muted">
        Untuk memeriksa pengajuan izin dan mengelola data siswa.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 p-5 sm:p-6 flex flex-col gap-4">
        <div>
          <label htmlFor="login-user" className="label">
            Username atau email
          </label>
          <input
            id="login-user"
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="login-pass" className="label">
            Password
          </label>
          <input
            id="login-pass"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>
        {error && (
          <p role="alert" className="alert-bad">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="flex justify-end">
        <ThemeToggle className="text-ink hover:bg-sunken" />
      </div>
      <div className="flex-1 flex items-center justify-center py-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
