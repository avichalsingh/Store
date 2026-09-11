"use client";

import { getAdminSession } from "@/admin/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    const session = getAdminSession();
    if (!session && !isLogin) {
      router.replace("/admin/login");
      return;
    }
    if (session && isLogin) {
      router.replace("/admin");
      return;
    }
    setReady(true);
  }, [pathname, isLogin, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--admin-bg)] text-sm text-[var(--admin-muted)]">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
