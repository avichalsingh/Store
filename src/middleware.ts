import { NextResponse, type NextRequest } from "next/server";
import { isAdminCookieHeaderValidEdge } from "@/lib/security/adminSessionEdge";
import { applySecurityHeaders } from "@/lib/security/headers";
import { updateSession } from "@/lib/supabase/middleware";

const CMS_PORT = "3020";

function withSecurityHeaders(
  response: NextResponse,
  pathname: string,
): NextResponse {
  applySecurityHeaders(response.headers, { pathname });
  return response;
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function requiresCustomerAuth(pathname: string): boolean {
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) return true;
  if (pathname.startsWith("/library/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  // Keep Supabase auth cookies fresh (no-op if env vars are missing).
  const { response: supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Normalize trailing slashes. With skipTrailingSlashRedirect, middleware owns
  // this. Next's built-in 308 used a bare path body with no Content-Type;
  // combined with nosniff, browsers may download it as a file named after the
  // last path segment (e.g. "homepage"). Use an absolute URL so NextURL cannot
  // reintroduce a trailing slash on the Location.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const cleanPath = pathname.replace(/\/+$/, "") || "/";
    const dest = new URL(
      `${cleanPath}${request.nextUrl.search}`,
      request.nextUrl.origin,
    );
    const redirect = NextResponse.redirect(dest, 308);
    redirect.headers.set("Content-Type", "text/html; charset=utf-8");
    copyCookies(supabaseResponse, redirect);
    return withSecurityHeaders(redirect, cleanPath);
  }

  // Preserve existing CMS-port convenience redirect: :3020 / → /admin
  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? host.split(":").pop() : "";
  if (port === CMS_PORT) {
    if (pathname === "/" || pathname === "") {
      const protocol = request.nextUrl.protocol || "http:";
      const redirect = NextResponse.redirect(`${protocol}//${host}/admin`);
      redirect.headers.set("Content-Type", "text/html; charset=utf-8");
      copyCookies(supabaseResponse, redirect);
      return withSecurityHeaders(redirect, pathname);
    }
  }

  const cookieHeader = request.headers.get("cookie");
  const adminOk = await isAdminCookieHeaderValidEdge(cookieHeader);

  // Server-side gate for Admin UI (client AuthGate alone is insufficient).
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!adminOk) {
      const login = request.nextUrl.clone();
      login.pathname = "/admin/login";
      login.search = "";
      const redirect = NextResponse.redirect(login);
      redirect.headers.set("Content-Type", "text/html; charset=utf-8");
      copyCookies(supabaseResponse, redirect);
      return withSecurityHeaders(redirect, pathname);
    }
  }

  // Server-side gate for admin APIs (except password login).
  if (pathname.startsWith("/api/admin")) {
    const isLoginPost =
      pathname === "/api/admin/session" && request.method === "POST";
    if (!isLoginPost && !adminOk) {
      const denied = NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
      copyCookies(supabaseResponse, denied);
      return withSecurityHeaders(denied, pathname);
    }
  }


  // Customer account + library require a Supabase Auth session.
  if (requiresCustomerAuth(pathname) && !user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/signin";
    const next =
      pathname + (request.nextUrl.search ? request.nextUrl.search : "");
    signIn.search = `?next=${encodeURIComponent(next)}`;
    const redirect = NextResponse.redirect(signIn);
    redirect.headers.set("Content-Type", "text/html; charset=utf-8");
    copyCookies(supabaseResponse, redirect);
    return withSecurityHeaders(redirect, pathname);
  }

  applySecurityHeaders(supabaseResponse.headers, { pathname });
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     * Required so Supabase can refresh auth cookies when present.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
