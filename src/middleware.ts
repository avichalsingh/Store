import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CMS_PORT = "3020";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const port = host.includes(":") ? host.split(":").pop() : "";
  if (port !== CMS_PORT) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/" || pathname === "") {
    const protocol = request.nextUrl.protocol || "http:";
    return NextResponse.redirect(`${protocol}//${host}/admin`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
