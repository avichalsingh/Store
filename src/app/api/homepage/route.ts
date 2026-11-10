import {
  isRawPublishedHomepageEmpty,
  normalizeHomepageConfigDocument,
  parsePublishedHomepageDocument,
  type HomepagePublicApiResponse,
} from "@/catalog/homepagePublished";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Published homepage must reflect the latest revision immediately after publish. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Public Supabase client is not configured");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function unpublished(
  partial?: Partial<HomepagePublicApiResponse>,
): NextResponse {
  return NextResponse.json(
    {
      status: "unpublished",
      document: null,
      publishedAt: null,
      publishedRevision: 0,
      ...partial,
    } satisfies HomepagePublicApiResponse,
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    },
  );
}

/**
 * Public published homepage configuration.
 * Reads catalog_homepage_config (published fields only). Never returns drafts.
 * Missing table / empty document → unpublished (storefront keeps local fallback).
 */
export async function GET() {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("catalog_homepage_config")
      .select("published, published_at, published_revision")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.error("[api/homepage] catalog_homepage_config:", error.message);
      return unpublished({
        error: "Homepage catalog temporarily unavailable",
      });
    }

    if (!data || isRawPublishedHomepageEmpty(data.published)) {
      return unpublished({
        publishedRevision:
          typeof data?.published_revision === "number"
            ? Math.max(0, Math.floor(data.published_revision))
            : 0,
        publishedAt:
          typeof data?.published_at === "string" ? data.published_at : null,
      });
    }

    const document = parsePublishedHomepageDocument(data.published);
    if (!document) {
      return unpublished();
    }

    // Re-normalize so clients always receive a stable HomepageConfigDocument.
    const normalized = normalizeHomepageConfigDocument(document);

    return NextResponse.json(
      {
        status: "published",
        document: normalized,
        publishedAt:
          typeof data.published_at === "string" ? data.published_at : null,
        publishedRevision:
          typeof data.published_revision === "number"
            ? Math.max(0, Math.floor(data.published_revision))
            : 0,
      } satisfies HomepagePublicApiResponse,
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.error("[api/homepage]", err);
    return unpublished({
      error: "Homepage catalog temporarily unavailable",
    });
  }
}
