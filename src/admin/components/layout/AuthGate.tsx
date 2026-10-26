"use client";

import {
  clearAdminSession,
  getAdminSession,
} from "@/admin/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

async function serverSessionValid(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const session = getAdminSession();

      if (!session && !isLogin) {
        router.replace("/admin/login");
        return;
      }

      // localStorage alone is not enough for Storage upload / publish APIs.
      if (session) {
        const apiOk = await serverSessionValid();
        if (cancelled) return;
        if (!apiOk) {
          clearAdminSession();
          if (!isLogin) {
            router.replace("/admin/login");
            return;
          }
          // Stay on login so the user can re-establish the httpOnly cookie.
          setReady(true);
          return;
        }
        if (isLogin) {
          router.replace("/admin");
          return;
        }
      }

      if (!cancelled) setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
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
