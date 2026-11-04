/**
 * Supabase Auth PKCE / email / magic-link callback.
 * Exchanges ?code= or verifies ?token_hash=&type=, then redirects to a safe next path.
 */

import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safeNextPath";

export const runtime = "nodejs";

const OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function asOtpType(raw: string | null): EmailOtpType | null {
  if (!raw || !OTP_TYPES.has(raw)) return null;
  return raw as EmailOtpType;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = asOtpType(url.searchParams.get("type"));
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

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return signInError(
          error.message || "Could not complete sign-in. Try again.",
        );
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }

    if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      });
      if (error) {
        return signInError(
          error.message || "Could not verify email link. Try again.",
        );
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  } catch {
    return signInError("Authentication service unavailable. Try again.");
  }

  return signInError(
    "Missing authentication code. Open the link from your email, or try signing in again.",
  );
}
