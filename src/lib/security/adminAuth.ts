/**
 * Server-only admin authorization.
 * Trust only the httpOnly session cookie derived from ADMIN_API_SECRET.
 * Never trust client localStorage, request body roles, or query flags.
 */

import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function unauthorizedJson(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function forbiddenJson(message = "Forbidden"): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

/** Read and validate the admin API session from the incoming cookie store. */
export async function requireAdminSession(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionTokenValid(sessionToken)) {
    return { ok: false, response: unauthorizedJson() };
  }
  return { ok: true };
}

export { isAdminCookieHeaderValidEdge as isAdminCookieHeaderValid } from "@/lib/security/adminSessionEdge";
