"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildAuthCallbackUrl, safeNextPath } from "@/lib/auth/safeNextPath";

type Mode = "signin" | "signup" | "magic";

export function CustomerAuthForm({
  nextPath,
  initialError,
}: {
  nextPath: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const next = useMemo(() => safeNextPath(nextPath), [nextPath]);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError?.trim() || "");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const emailRedirectTo = buildAuthCallbackUrl(
        window.location.origin,
        next,
      );

      if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: { emailRedirectTo },
        });
        if (otpError) {
          setError(otpError.message);
          return;
        }
        setInfo("Check your email for a magic link to finish signing in.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }
        // Unconfirmed signup (or existing unconfirmed email): no session until
        // the confirmation / magic link hits /auth/callback.
        const identities = data.user?.identities ?? [];
        if (!data.user || identities.length === 0) {
          setInfo(
            "If an account already exists for this email, sign in instead. Otherwise check your email to confirm, then return here.",
          );
        } else {
          setInfo(
            "Account created. Check your email for a confirmation link — it returns you here after you confirm — then sign in.",
          );
        }
        setMode("signin");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach authentication. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
            ["magic", "Magic link"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              setError("");
              setInfo("");
            }}
            className={
              mode === id
                ? "rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted transition hover:text-text"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Email
        </span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
          placeholder="you@email.com"
        />
      </label>

      {mode !== "magic" ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Password
          </span>
          <input
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
            placeholder="At least 8 characters"
          />
        </label>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-text">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text">
          {info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy
          ? "Please wait…"
          : mode === "signup"
            ? "Create account"
            : mode === "magic"
              ? "Email me a magic link"
              : "Sign in"}
      </button>

      <p className="text-center text-xs text-muted">
        By continuing you agree to the{" "}
        <Link href="/about#terms" className="text-text underline-offset-2 hover:underline">
          terms
        </Link>{" "}
        on the About page.
      </p>
    </form>
  );
}
