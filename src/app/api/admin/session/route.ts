import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  deriveAdminSessionToken,
  isAdminPasswordValid,
} from "@/admin/lib/adminSessionCookie";
import { NextResponse } from "next/server";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Establish httpOnly admin session cookie for catalog publish.
 * Password must match server-only ADMIN_API_SECRET (never returned to client).
 */
export async function POST(request: Request) {
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

  if (!process.env.ADMIN_API_SECRET?.trim()) {
    return NextResponse.json(
      { error: "Admin session is not configured on the server" },
      { status: 500 },
    );
  }

  if (!isAdminPasswordValid(password)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
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
