/**
 * Auth + entitlement gated master download.
 * Returns a short-lived signed URL only; never returns storage object paths.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createEntitledMasterDownload } from "@/lib/commerce/download";

export const runtime = "nodejs";

async function handle(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sign in required to download purchases",
        code: "AUTH_REQUIRED",
      },
      { status: 401 },
    );
  }

  let productId = "";
  if (request.method === "GET") {
    const url = new URL(request.url);
    productId = url.searchParams.get("productId")?.trim() || "";
  } else {
    try {
      const body = (await request.json()) as { productId?: string };
      productId = body.productId?.trim() || "";
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }
  }

  if (!productId) {
    return NextResponse.json(
      { ok: false, error: "productId required", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Download service unavailable", code: "MISCONFIGURED" },
      { status: 503 },
    );
  }

  const result = await createEntitledMasterDownload(admin, {
    userId: user.id,
    productId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status: result.status },
    );
  }

  // Do not log signedUrl.
  return NextResponse.json({
    ok: true,
    expiresIn: result.expiresIn,
    fileName: result.fileName,
    downloadUrl: result.signedUrl,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
