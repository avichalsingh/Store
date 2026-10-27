import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  deriveAdminSessionToken,
  isAdminPasswordValid,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import {
  clientIpFromRequest,
  rateLimit,
} from "@/lib/security/rateLimit";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * Lightweight check: is the httpOnly admin API session cookie valid?
 * Used by AuthGate so Media upload/publish cannot run on localStorage-only "login".
 */
export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionTokenValid(sessionToken)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true });
}

/**
 * Establish httpOnly admin session cookie for catalog publish.
 * Password must match server-only ADMIN_API_SECRET (never returned to client).
 */
export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`admin-login:${ip}`, {
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 },
    );
  }
  // Bound password size to limit timing/CPU abuse.
  if (password.length > 512) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ADMIN_API_SECRET?.trim()) {
    return NextResponse.json(
      { error: "Admin session is not configured on the server" },
      { status: 500 },
    );
  }

  if (!isAdminPasswordValid(password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = deriveAdminSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Admin session is not configured on the server" },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    token,
    adminSessionCookieOptions(SESSION_MAX_AGE),
  );
  return response;
}

/** Clear admin publish session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
