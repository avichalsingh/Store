/**
 * Admin-only private prompt/caption seed payload API.
 * Requires verified httpOnly admin session. Never used by storefront.
 */

import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { getSeedPrivatePayload } from "@/admin/lib/privateProductPayloads.server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionTokenValid(sessionToken)) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId")?.trim() || "";
  if (!productId || productId.length > 128) {
    return NextResponse.json(
      { ok: false, error: "productId required" },
      { status: 400 },
    );
  }

  const payload = getSeedPrivatePayload(productId);
  if (!payload) {
    return NextResponse.json({
      ok: true,
      productId,
      payload: null,
    });
  }

  return NextResponse.json({
    ok: true,
    productId,
    payload,
  });
}
