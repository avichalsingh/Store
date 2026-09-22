import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const CMS_PORT = "3020";

export async function middleware(request: NextRequest) {
  // Keep Supabase auth cookies fresh (no-op if env vars are missing).
  const supabaseResponse = await updateSession(request);

  // Preserve existing CMS-port convenience redirect: :3020 / → /admin
  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? host.split(":").pop() : "";
  if (port === CMS_PORT) {
    const { pathname } = request.nextUrl;
    if (pathname === "/" || pathname === "") {
      const protocol = request.nextUrl.protocol || "http:";
      const redirect = NextResponse.redirect(`${protocol}//${host}/admin`);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie);
      });
      return redirect;
    }
  }

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
