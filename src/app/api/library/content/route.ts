/**
 * Auth + entitlement gated private prompt / caption text.
 * Never returns private fields through public catalog APIs.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createEntitledLibraryContent } from "@/lib/commerce/libraryContent";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Vary: "Cookie, Authorization",
} as const;

function json(
  body: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return json(
      {
        ok: false,
        error: "Auth is not configured",
        code: "AUTH_MISCONFIGURED",
      },
      503,
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json(
      {
        ok: false,
        error: "Sign in required to view purchased content",
        code: "AUTH_REQUIRED",
      },
      401,
    );
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId")?.trim() || "";

  if (!productId) {
    return json(
      { ok: false, error: "productId required", code: "BAD_REQUEST" },
      400,
    );
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return json(
      {
        ok: false,
        error: "Content service unavailable",
        code: "MISCONFIGURED",
      },
      503,
    );
  }

  const result = await createEntitledLibraryContent(admin, {
    userId: user.id,
    productId,
  });

  if (!result.ok) {
    return json(
      { ok: false, error: result.error, code: result.code },
      result.status,
    );
  }

  if (result.productType === "PROMPT") {
    return json(
      {
        ok: true,
        productId: result.productId,
        productType: result.productType,
        title: result.title,
        promptData: result.promptData,
      },
      200,
    );
  }

  return json(
    {
      ok: true,
      productId: result.productId,
      productType: result.productType,
      title: result.title,
      captionPackData: result.captionPackData,
    },
    200,
  );
}
