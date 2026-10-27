/**
 * Edge-compatible admin session cookie verification (Web Crypto).
 * Must match deriveAdminSessionToken() in adminSessionCookie.ts exactly.
 */

export const ADMIN_SESSION_COOKIE = "rhythm_admin_session";
const SESSION_PURPOSE = "rhythm-admin-publish-v1";

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveAdminSessionTokenEdge(
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(SESSION_PURPOSE),
  );
  return bytesToHex(sig);
}

export async function isAdminCookieHeaderValidEdge(
  cookieHeader: string | null | undefined,
): Promise<boolean> {
  if (!cookieHeader) return false;
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) return false;

  const match = new RegExp(
    `(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`,
  ).exec(cookieHeader);
  if (!match?.[1]) return false;

  let token: string;
  try {
    token = decodeURIComponent(match[1]);
  } catch {
    return false;
  }

  try {
    const expected = await deriveAdminSessionTokenEdge(secret);
    return timingSafeEqualHex(token, expected);
  } catch {
    return false;
  }
}
