import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "rhythm_admin_session";

const SESSION_PURPOSE = "rhythm-admin-publish-v1";

function getAdminApiSecret(): string | null {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || !secret.trim()) return null;
  return secret;
}

/** Derive a cookie token from ADMIN_API_SECRET (never store the secret itself). */
export function deriveAdminSessionToken(): string | null {
  const secret = getAdminApiSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(SESSION_PURPOSE).digest("hex");
}

export function isAdminSessionTokenValid(
  token: string | undefined | null,
): boolean {
  if (!token) return false;
  const expected = deriveAdminSessionToken();
  if (!expected) return false;
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Timing-safe compare of submitted password to ADMIN_API_SECRET. */
export function isAdminPasswordValid(password: string): boolean {
  const secret = getAdminApiSecret();
  if (!secret) return false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function adminSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
