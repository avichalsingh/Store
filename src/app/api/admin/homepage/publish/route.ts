import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { decideHomepagePublish } from "@/catalog/homepagePublishGate";
import {
  homepagePublishUserMessage,
  isHomepageRemotePublishEnabled,
} from "@/catalog/homepageRemotePublish";
import { createServiceClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function safeServerError(fallback: string) {
  return NextResponse.json({ error: fallback }, { status: 500 });
}

function parseExpectedRevision(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

/**
 * Publish HomepageConfigDocument to the homepage_config singleton.
 * Draft remains in Admin localStorage until this endpoint succeeds with the gate on.
 * Gated by HOMEPAGE_REMOTE_PUBLISH only (separate from catalog product publish).
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionTokenValid(sessionToken)) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawDocument =
    record.document !== undefined
      ? record.document
      : record.homepage !== undefined
        ? record.homepage
        : body;

  const expectedPublishedRevision = parseExpectedRevision(
    record.expectedPublishedRevision,
  );

  // Gate-off path: validate + normalize only. Never open Supabase / never write.
  if (!isHomepageRemotePublishEnabled()) {
    const dryRun = decideHomepagePublish({
      rawDocument,
      expectedPublishedRevision,
      env: process.env,
    });
    if (!dryRun.ok || !dryRun.dryRun) {
      return safeServerError("Homepage publish dry-run failed");
    }
    return NextResponse.json({
      ok: true,
      dryRun: true,
      id: "default",
      status: "published",
      publishedRevision: dryRun.publishedRevision,
      publishedAt: null,
      message: dryRun.message,
    });
  }

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  ) {
    return safeServerError("Server homepage publish is not configured");
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return safeServerError("Server homepage publish is not configured");
  }

  const { data: existing, error: readError } = await supabase
    .from("homepage_config")
    .select("published_revision")
    .eq("id", "default")
    .maybeSingle();

  if (readError) {
    console.error("[homepage/publish] read:", readError.message);
    return safeServerError("Failed to read homepage config");
  }

  const currentRevision =
    typeof existing?.published_revision === "number"
      ? Math.max(0, Math.floor(existing.published_revision))
      : 0;

  const decision = decideHomepagePublish({
    rawDocument,
    expectedPublishedRevision,
    currentPublishedRevision: currentRevision,
    env: process.env,
  });

  if (!decision.ok) {
    return NextResponse.json(
      {
        error: decision.error,
        currentPublishedRevision: decision.currentPublishedRevision,
        expectedPublishedRevision: decision.expectedPublishedRevision,
      },
      { status: 409 },
    );
  }

  if (decision.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      id: "default",
      status: "published",
      publishedRevision: decision.publishedRevision,
      publishedAt: null,
      message: decision.message,
    });
  }

  const publishedAt = new Date().toISOString();

  const { error: writeError } = await supabase.from("homepage_config").upsert(
    {
      id: "default",
      published: decision.document,
      published_at: publishedAt,
      published_revision: decision.nextPublishedRevision,
      updated_at: publishedAt,
    },
    { onConflict: "id" },
  );

  if (writeError) {
    console.error("[homepage/publish] upsert:", writeError.message);
    return safeServerError("Failed to publish homepage config");
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    id: "default",
    status: "published",
    publishedRevision: decision.nextPublishedRevision,
    publishedAt,
    message: homepagePublishUserMessage(false),
  });
}
