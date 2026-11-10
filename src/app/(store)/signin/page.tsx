import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerAuthForm } from "@/components/auth/CustomerAuthForm";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const initialError =
    typeof params.error === "string" ? params.error.slice(0, 200) : null;

  let user = null;
  let authMisconfigured = false;
  try {
    const supabase = await createClient();
    const session = await supabase.auth.getUser();
    user = session.data.user;
  } catch {
    authMisconfigured = true;
  }
  if (user) {
    redirect(next);
  }

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 pb-20 pt-28 sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-64 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 0%, color-mix(in oklab, var(--accent) 22%, transparent), transparent)",
        }}
        aria-hidden
      />
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Account
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Sign in to PRAGVI
      </h1>
      <p className="mt-3 text-muted">
        Access checkout, purchases, and downloads. After signing in you&apos;ll
        return to where you left off.
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        {authMisconfigured ? (
          <p className="text-sm text-muted" role="alert">
            Sign-in is temporarily unavailable because authentication is not
            configured in this environment. Set{" "}
            <code className="text-text">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            for Preview/Production, then reload.
          </p>
        ) : (
          <CustomerAuthForm nextPath={next} initialError={initialError} />
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Prefer browsing first?{" "}
        <Link href="/explore" className="font-medium text-text hover:text-accent">
          Explore the catalog
        </Link>
      </p>
    </div>
  );
}
