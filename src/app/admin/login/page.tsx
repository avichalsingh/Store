"use client";

import { setAdminSession } from "@/admin/lib/auth";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminField, AdminInput } from "@/admin/components/ui/AdminField";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter any email and password to continue.");
      return;
    }
    setAdminSession({
      email: email.trim(),
      name: email.trim().split("@")[0] || "Admin",
      loggedInAt: new Date().toISOString(),
    });
    router.replace("/admin");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 20%, #e23d7320, transparent), radial-gradient(ellipse 50% 40% at 80% 80%, #5b4de818, transparent), var(--admin-bg)",
        }}
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-8 shadow-[var(--admin-shadow-lg)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--admin-accent)] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-[family-name:var(--font-syne)] text-lg font-semibold">
              RHYTHM Admin
            </p>
            <p className="text-xs text-[var(--admin-muted)]">Sign in to the studio CMS</p>
          </div>
        </div>

        <div className="space-y-4">
          <AdminField label="Email">
            <AdminInput
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@rhythm.studio"
            />
          </AdminField>
          <AdminField label="Password">
            <AdminInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Any password for demo"
            />
          </AdminField>
          {error ? <p className="text-sm text-[var(--admin-danger)]">{error}</p> : null}
          <AdminButton type="submit" variant="primary" className="w-full" size="lg">
            Sign in
          </AdminButton>
        </div>
        <p className="mt-5 text-center text-xs text-[var(--admin-muted)]">
          Demo auth — any non-empty credentials work.
        </p>
      </form>
    </div>
  );
}
