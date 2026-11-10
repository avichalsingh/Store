/**
 * Public-safe CMS product shaping for storefront persistence.
 * Private paid text never belongs in shared localStorage / visitor memory.
 */

import type { AdminProduct } from "@/admin/types";
import {
  captionHasHiddenTail,
  captionTeaserLead,
  firstVisibleHashtag,
  formatHashtagTag,
} from "@/catalog/contentPackTeaser";
import type {
  CaptionPackData,
  CaptionPackItem,
  PromptData,
} from "@/catalog/productPayloads";

/** Marker stored in public caption item notes — not private body. */
export const PUBLIC_CAPTION_TEASER_NOTES = "public-teaser";

/** Fields that must never ship to storefront CMS state. */
export type PrivatePaidProductPayload = {
  promptData?: Pick<
    PromptData,
    | "mainPrompt"
    | "negativePrompt"
    | "generationSettings"
    | "modelNotes"
    | "instructions"
  >;
  captionPackData?: CaptionPackData;
};

function privatePayloadSubstance(payload: PrivatePaidProductPayload): number {
  let n = 0;
  if (payload.promptData) {
    n += payload.promptData.mainPrompt?.length ?? 0;
    n += payload.promptData.negativePrompt?.length ?? 0;
    n += payload.promptData.generationSettings?.length ?? 0;
    n += payload.promptData.modelNotes?.length ?? 0;
    n += payload.promptData.instructions?.length ?? 0;
  }
  for (const item of payload.captionPackData?.items ?? []) {
    if (item.notes === PUBLIC_CAPTION_TEASER_NOTES) continue;
    n += item.caption?.length ?? 0;
    n += (item.hashtags ?? []).join("").length;
  }
  return n;
}

export function extractPrivatePaidProductPayload(
  product: AdminProduct,
): PrivatePaidProductPayload | null {
  const out: PrivatePaidProductPayload = {};

  if (product.promptData) {
    const {
      mainPrompt,
      negativePrompt,
      generationSettings,
      modelNotes,
      instructions,
    } = product.promptData;
    if (
      mainPrompt?.trim() ||
      negativePrompt?.trim() ||
      generationSettings?.trim() ||
      modelNotes?.trim() ||
      instructions?.trim()
    ) {
      out.promptData = {
        mainPrompt: mainPrompt ?? "",
        negativePrompt,
        generationSettings,
        modelNotes,
        instructions,
      };
    }
  }

  if (product.captionPackData?.items?.length) {
    const items = product.captionPackData.items
      .filter((item) => item.notes !== PUBLIC_CAPTION_TEASER_NOTES)
      .map((item) => ({
        ...item,
        caption: item.caption ?? "",
        hashtags: [...(item.hashtags ?? [])],
      }));
    const hasPrivate = items.some(
      (i) => i.caption.trim() || i.hashtags.some((h) => h.trim()),
    );
    if (hasPrivate) {
      out.captionPackData = { items };
    }
  }

  return out.promptData || out.captionPackData ? out : null;
}

/**
 * Prefer richer vault entries so public teaser slices never overwrite full
 * private bodies when collecting from already-stripped products.
 */
export function preferRicherPrivatePayload(
  previous: PrivatePaidProductPayload | undefined,
  next: PrivatePaidProductPayload,
): PrivatePaidProductPayload {
  if (!previous) return next;
  return privatePayloadSubstance(previous) > privatePayloadSubstance(next)
    ? previous
    : next;
}

function publicPromptData(
  data: PromptData | undefined,
): PromptData | undefined {
  if (!data) return undefined;
  return {
    mainPrompt: "",
    negativePrompt: "",
    generationSettings: "",
    modelNotes: "",
    instructions: "",
    publicTeaser: data.publicTeaser ?? "",
    canGenerate: data.canGenerate ?? "",
    sectionCount: data.sectionCount,
  };
}

function publicCaptionItems(items: CaptionPackItem[]): CaptionPackItem[] {
  return items.map((item) => {
    if (item.notes === PUBLIC_CAPTION_TEASER_NOTES) {
      return {
        id: item.id,
        caption: item.caption ?? "",
        hashtags: [...(item.hashtags ?? [])],
        label: item.label ?? "",
        notes: PUBLIC_CAPTION_TEASER_NOTES,
      };
    }
    const lead = captionTeaserLead(item.caption ?? "");
    const visible = firstVisibleHashtag(item.hashtags);
    const hasMore =
      captionHasHiddenTail(item.caption ?? "", lead) ||
      (item.hashtags ?? []).filter((t) => t.trim()).length > 1;
    // Fail closed: if the full paid caption/hashtag set would fit in the
    // public teaser window, do not publish it unmarked as free catalogue text.
    if (!hasMore) {
      return {
        id: item.id,
        caption: "",
        hashtags: [],
        label: item.label ?? "",
        notes: "",
      };
    }
    const tag = visible ? formatHashtagTag(visible).replace(/^#/, "") : "";
    return {
      id: item.id,
      caption: lead,
      hashtags: tag ? [tag] : [],
      label: item.label ?? "",
      notes: PUBLIC_CAPTION_TEASER_NOTES,
    };
  });
}

/** Strip private paid text; keep teasers, labels, and structure. */
export function stripPrivatePaidProductFields(
  product: AdminProduct,
): AdminProduct {
  let next = product;
  if (product.promptData) {
    next = { ...next, promptData: publicPromptData(product.promptData) };
  }
  if (product.captionPackData?.items) {
    next = {
      ...next,
      captionPackData: {
        items: publicCaptionItems(product.captionPackData.items),
      },
    };
  }
  return next;
}

export function stripPrivatePaidProducts(
  products: AdminProduct[],
): AdminProduct[] {
  return products.map(stripPrivatePaidProductFields);
}

export function mergePrivatePaidProductPayload(
  product: AdminProduct,
  payload: PrivatePaidProductPayload | null | undefined,
): AdminProduct {
  if (!payload) return product;
  let next = product;
  if (payload.promptData && product.promptData) {
    next = {
      ...next,
      promptData: {
        ...product.promptData,
        ...payload.promptData,
      },
    };
  } else if (payload.promptData) {
    next = {
      ...next,
      promptData: {
        mainPrompt: payload.promptData.mainPrompt ?? "",
        negativePrompt: payload.promptData.negativePrompt,
        generationSettings: payload.promptData.generationSettings,
        modelNotes: payload.promptData.modelNotes,
        instructions: payload.promptData.instructions,
        publicTeaser: "",
        canGenerate: "",
      },
    };
  }
  if (payload.captionPackData?.items?.length) {
    next = { ...next, captionPackData: structuredClone(payload.captionPackData) };
  }
  return next;
}

export function productHasPrivatePaidContent(product: AdminProduct): boolean {
  return extractPrivatePaidProductPayload(product) != null;
}
