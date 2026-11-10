/**
 * Entitlement-gated private prompt / caption delivery.
 * Reads private product columns via service role after ownership check.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { userHasEntitlement } from "@/lib/commerce/download";
import type { CaptionPackData, PromptData } from "@/catalog/productPayloads";

export type LibraryContentResult =
  | {
      ok: true;
      productId: string;
      productType: "PROMPT" | "CAPTION_PACK";
      title: string;
      promptData?: PromptData;
      captionPackData?: CaptionPackData;
    }
  | { ok: false; status: number; error: string; code: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asPromptData(raw: unknown): PromptData | null {
  if (!isRecord(raw)) return null;
  const mainPrompt =
    typeof raw.mainPrompt === "string" ? raw.mainPrompt : "";
  // Private body required — publicTeaser alone is not entitled content.
  if (!mainPrompt.trim()) return null;
  return {
    mainPrompt,
    negativePrompt:
      typeof raw.negativePrompt === "string" ? raw.negativePrompt : undefined,
    generationSettings:
      typeof raw.generationSettings === "string"
        ? raw.generationSettings
        : undefined,
    modelNotes: typeof raw.modelNotes === "string" ? raw.modelNotes : undefined,
    instructions:
      typeof raw.instructions === "string" ? raw.instructions : undefined,
    publicTeaser:
      typeof raw.publicTeaser === "string" ? raw.publicTeaser : undefined,
    canGenerate:
      typeof raw.canGenerate === "string" ? raw.canGenerate : undefined,
    sectionCount:
      typeof raw.sectionCount === "number" ? raw.sectionCount : undefined,
  };
}

function asCaptionPackData(raw: unknown): CaptionPackData | null {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return null;
  const items = raw.items
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const caption = typeof item.caption === "string" ? item.caption : "";
      const hashtags = Array.isArray(item.hashtags)
        ? item.hashtags.filter((h): h is string => typeof h === "string")
        : [];
      return {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id
            : `item-${index + 1}`,
        caption,
        hashtags,
        label: typeof item.label === "string" ? item.label : undefined,
        notes: typeof item.notes === "string" ? item.notes : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (
    items.length === 0 ||
    !items.some((i) => i.caption.trim() || i.hashtags.some((h) => h.trim()))
  ) {
    return null;
  }
  return { items };
}

export async function createEntitledLibraryContent(
  admin: SupabaseClient,
  params: { userId: string; productId: string },
): Promise<LibraryContentResult> {
  const productId = params.productId.trim();
  if (!productId || productId.length > 128) {
    return {
      ok: false,
      status: 400,
      error: "Invalid product id",
      code: "BAD_PRODUCT_ID",
    };
  }

  const entitled = await userHasEntitlement(admin, params.userId, productId);
  if (!entitled) {
    return {
      ok: false,
      status: 403,
      error: "Purchase entitlement required",
      code: "ENTITLEMENT_REQUIRED",
    };
  }

  const { data: product, error } = await admin
    .from("products")
    .select("id, name, product_type, status, prompt_data, caption_pack_data")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: "Could not load product content",
      code: "PRODUCT_LOOKUP_FAILED",
    };
  }

  if (!product) {
    return {
      ok: false,
      status: 404,
      error: "Product not found",
      code: "PRODUCT_NOT_FOUND",
    };
  }

  const productType = String(product.product_type ?? "");
  const title =
    typeof product.name === "string" && product.name.trim()
      ? product.name.trim()
      : "Product";

  if (productType === "PROMPT") {
    const promptData = asPromptData(product.prompt_data);
    if (!promptData) {
      return {
        ok: false,
        status: 404,
        error: "Prompt content is not available",
        code: "CONTENT_UNAVAILABLE",
      };
    }
    return {
      ok: true,
      productId,
      productType: "PROMPT",
      title,
      promptData,
    };
  }

  if (productType === "CAPTION_PACK") {
    const captionPackData = asCaptionPackData(product.caption_pack_data);
    if (!captionPackData) {
      return {
        ok: false,
        status: 404,
        error: "Caption pack content is not available",
        code: "CONTENT_UNAVAILABLE",
      };
    }
    return {
      ok: true,
      productId,
      productType: "CAPTION_PACK",
      title,
      captionPackData,
    };
  }

  return {
    ok: false,
    status: 400,
    error: "Unsupported product type for text content",
    code: "UNSUPPORTED_TYPE",
  };
}
