/**
 * CAPTION_PACK data migrations (load-time, idempotent).
 * Converts legacy caption-only and hashtag-only records into unified items[].
 */

import type { AdminProduct } from "@/admin/types";
import type {
  CaptionItem,
  CaptionPackData,
  CaptionPackItem,
  HashtagPackData,
} from "@/catalog/productPayloads";
import { HASHTAGS_PER_SET } from "@/catalog/productTypes";

function padHashtags(tags: string[] | undefined): string[] {
  const hashtags = [...(tags ?? [])];
  while (hashtags.length < HASHTAGS_PER_SET) hashtags.push("");
  return hashtags.slice(0, HASHTAGS_PER_SET);
}

function blankItem(id?: string): CaptionPackItem {
  return {
    id: id ?? `item-${Date.now()}`,
    caption: "",
    hashtags: padHashtags([]),
    label: "",
    notes: "",
  };
}

/** Legacy captions[] → items[] with empty hashtag slots. */
export function itemsFromLegacyCaptions(
  captions: CaptionItem[] | undefined,
): CaptionPackItem[] {
  return (captions ?? []).map((c) => ({
    id: c.id,
    caption: c.text ?? "",
    hashtags: padHashtags([]),
    label: c.label ?? "",
    notes: c.notes ?? "",
  }));
}

/** Legacy hashtag sets[] → items[] (caption optional; hashtags preserved). */
export function itemsFromHashtagSets(
  data: HashtagPackData | undefined,
): CaptionPackItem[] {
  return (data?.sets ?? []).map((set) => ({
    id: set.id,
    caption: "",
    hashtags: padHashtags(set.hashtags),
    label: set.name ?? "",
    notes: set.description ?? "",
  }));
}

export function normalizeCaptionPackItems(
  items: CaptionPackItem[] | undefined,
): CaptionPackItem[] {
  return (items ?? []).map((item) => ({
    ...item,
    caption: item.caption ?? "",
    hashtags: padHashtags(item.hashtags),
    label: item.label ?? "",
    notes: item.notes ?? "",
  }));
}

/** Normalize any stored captionPackData shape to items[]. */
export function migrateCaptionPackData(
  raw: Partial<CaptionPackData> & { captions?: CaptionItem[] } | undefined,
): CaptionPackData {
  if (raw?.items?.length) {
    return { items: normalizeCaptionPackItems(raw.items) };
  }
  if (raw?.captions?.length) {
    return { items: itemsFromLegacyCaptions(raw.captions) };
  }
  return { items: [] };
}

/**
 * Migrate stored admin products:
 * - CONTENT_PACK → CAPTION_PACK (contentPackData.items → captionPackData.items)
 * - HASHTAG_PACK → CAPTION_PACK (items from sets)
 * - CAPTION_PACK captions[] → items[]
 */
export function migrateAdminProductPackTypes(
  raw: Partial<AdminProduct> & { id: string },
): Partial<AdminProduct> & { id: string } {
  const rawType = raw.productType as string | undefined;

  if (rawType === "CONTENT_PACK") {
    const items = normalizeCaptionPackItems(raw.contentPackData?.items);
    return {
      ...raw,
      productType: "CAPTION_PACK",
      category: raw.category || "Caption Packs",
      captionPackData: { items },
      contentPackData: undefined,
    };
  }

  if (rawType === "HASHTAG_PACK") {
    const items = itemsFromHashtagSets(raw.hashtagPackData);
    return {
      ...raw,
      productType: "CAPTION_PACK",
      category: raw.category || "Caption Packs",
      captionPackData: { items },
      hashtagPackData: undefined,
    };
  }

  if (rawType === "CAPTION_PACK") {
    return {
      ...raw,
      captionPackData: migrateCaptionPackData(
        raw.captionPackData as
          | (Partial<CaptionPackData> & { captions?: CaptionItem[] })
          | undefined,
      ),
    };
  }

  return raw;
}
