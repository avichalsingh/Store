/**
 * Browser helper for entitlement-gated prompt / caption content.
 * Never falls back to AdminProvider / localStorage private fields.
 */

import type { CaptionPackData, PromptData } from "@/catalog/productPayloads";

export type LibraryContentResponse =
  | {
      ok: true;
      productId: string;
      productType: "PROMPT" | "CAPTION_PACK";
      title: string;
      promptData?: PromptData;
      captionPackData?: CaptionPackData;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
    };

export async function fetchLibraryContent(
  productId: string,
): Promise<LibraryContentResponse> {
  const id = productId.trim();
  if (!id) {
    return {
      ok: false,
      status: 400,
      error: "productId required",
      code: "BAD_REQUEST",
    };
  }

  try {
    const res = await fetch(
      `/api/library/content?productId=${encodeURIComponent(id)}`,
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );

    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      code?: string;
      productId?: string;
      productType?: "PROMPT" | "CAPTION_PACK";
      title?: string;
      promptData?: PromptData;
      captionPackData?: CaptionPackData;
    } | null;

    if (!res.ok || !body?.ok) {
      return {
        ok: false,
        status: res.status,
        error:
          (body && typeof body.error === "string" && body.error) ||
          "Could not load purchased content",
        code:
          (body && typeof body.code === "string" && body.code) ||
          "CONTENT_FETCH_FAILED",
      };
    }

    if (body.productType === "PROMPT" && body.promptData) {
      return {
        ok: true,
        productId: body.productId || id,
        productType: "PROMPT",
        title: body.title || "Product",
        promptData: body.promptData,
      };
    }

    if (body.productType === "CAPTION_PACK" && body.captionPackData) {
      return {
        ok: true,
        productId: body.productId || id,
        productType: "CAPTION_PACK",
        title: body.title || "Product",
        captionPackData: body.captionPackData,
      };
    }

    return {
      ok: false,
      status: 502,
      error: "Unexpected content payload",
      code: "BAD_PAYLOAD",
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Network error loading content",
      code: "NETWORK_ERROR",
    };
  }
}
