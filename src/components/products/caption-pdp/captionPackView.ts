import type { CaptionPackProductPublic } from "@/types";

export type CaptionPackView = CaptionPackProductPublic;

export function isCaptionPackProduct(
  product: { productType: string },
): product is CaptionPackProductPublic {
  return product.productType === "CAPTION_PACK";
}

export function captionItemCount(product: CaptionPackView): number {
  return product.itemCount;
}

export function captionRemainingCount(product: CaptionPackView): number {
  const previewed = product.previewItems?.length ?? 0;
  return Math.max(0, product.itemCount - previewed);
}

export function captionPurchaseValueItems(product: CaptionPackView): string[] {
  return [
    `All ${product.itemCount} caption + hashtag combos`,
    "Copy & paste ready",
    "Yours forever",
  ];
}
