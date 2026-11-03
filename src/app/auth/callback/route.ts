/**
 * Supabase Auth PKCE / magic-link callback.
 * Exchanges ?code= for a session cookie, then redirects to a safe next path.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safeNextPath";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const providerError =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error");

  const signInError = (message: string) => {
    const dest = new URL("/signin", url.origin);
    dest.searchParams.set("error", message);
    dest.searchParams.set("next", next);
    return NextResponse.redirect(dest);
  };

  if (providerError) {
    return signInError(providerError.slice(0, 200));
  }

  if (!code) {
    return signInError("Missing authentication code. Try signing in again.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return signInError(
        error.message || "Could not complete sign-in. Try again.",
      );
    }
  } catch {
    return signInError("Authentication service unavailable. Try again.");
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
