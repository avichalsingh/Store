/**
 * Public-safe teaser shaping for CAPTION_PACK storefront previews.
 * Full captions/hashtags remain in admin CMS only until purchase.
 */

export const CAPTION_PACK_TEASER_WORDS = 3;
export const CAPTION_PACK_LOCKED_PILL_COUNT = 4;

export function captionTeaserLead(
  caption: string,
  maxWords = CAPTION_PACK_TEASER_WORDS,
): string {
  const trimmed = caption.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) {
    const maxChars = Math.max(10, Math.ceil(trimmed.length * 0.4));
    return trimmed.slice(0, maxChars);
  }
  return words.slice(0, maxWords).join(" ");
}

export function captionHasHiddenTail(caption: string, lead: string): boolean {
  return lead.length < caption.trim().length;
}

export function formatHashtagTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function firstVisibleHashtag(hashtags: string[] | undefined): string | undefined {
  const first = (hashtags ?? []).map((t) => t.trim()).find(Boolean);
  return first ? formatHashtagTag(first) : undefined;
}

export function lockedHashtagPillCount(hashtags: string[] | undefined): number {
  const visibleCount = (hashtags ?? []).filter((t) => t.trim()).length;
  return Math.max(CAPTION_PACK_LOCKED_PILL_COUNT, Math.max(0, visibleCount - 1));
}

export type PublicCaptionPackPreviewItem = {
  captionLead: string;
  visibleHashtag?: string;
  label?: string;
  hasMoreCaption: boolean;
  hasMoreHashtags: boolean;
};

export function toPublicCaptionPackPreviewItem(item: {
  caption: string;
  hashtags?: string[];
  label?: string;
}): PublicCaptionPackPreviewItem {
  const captionLead = captionTeaserLead(item.caption);
  const visibleHashtag = firstVisibleHashtag(item.hashtags);
  const hashtagCount = (item.hashtags ?? []).filter((t) => t.trim()).length;
  return {
    captionLead,
    visibleHashtag,
    label: item.label?.trim() || undefined,
    hasMoreCaption: captionHasHiddenTail(item.caption, captionLead),
    hasMoreHashtags: hashtagCount > 1,
  };
}
