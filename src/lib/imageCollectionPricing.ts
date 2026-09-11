import type { Region } from "@/types";

export type CollectionBundleQuote = {
  imageCount: number;
  compare: number;
  sale: number;
  save: number;
  perImage: number;
  badge: string;
};

/** Full-collection bundle pricing — CMS sale/compare overrides when provided. */
export function getCollectionBundleQuote(
  singleSale: number,
  imageCount: number,
  region: Region,
  overrides?: {
    saleInr?: number;
    saleUsd?: number;
    compareInr?: number;
    compareUsd?: number;
    badgeText?: string;
    massiveThreshold?: number;
  },
): CollectionBundleQuote {
  const compare =
    region === "india"
      ? (overrides?.compareInr ??
        roundMoney(singleSale * imageCount, region))
      : (overrides?.compareUsd ??
        roundMoney(singleSale * imageCount, region));

  const sale =
    region === "india"
      ? (overrides?.saleInr ?? defaultBundleSale(singleSale, imageCount, region))
      : (overrides?.saleUsd ?? defaultBundleSale(singleSale, imageCount, region));

  const save = Math.max(0, compare - sale);
  const perImage = roundMoney(sale / imageCount, region);
  const threshold = overrides?.massiveThreshold ?? 12;
  const badge =
    overrides?.badgeText ??
    (imageCount >= threshold ? "MASSIVE COLLECTION DEAL" : "BEST VALUE");

  return {
    imageCount,
    compare,
    sale,
    save,
    perImage,
    badge,
  };
}

function defaultBundleSale(
  singleSale: number,
  imageCount: number,
  region: Region,
) {
  /** Fallback when pack CMS price is missing — bigger collections = lower fraction. */
  const ratios: Record<number, number> = {
    4: 0.3125,
    5: 0.325,
    12: 0.208,
    20: 0.187,
  };
  const ratio =
    ratios[imageCount] ?? Math.max(0.15, 0.35 - imageCount * 0.008);
  return roundMoney(singleSale * imageCount * ratio, region);
}

export function roundMoney(n: number, region: Region) {
  if (region === "india") return Math.max(1, Math.round(n));
  return Math.max(0.5, Math.round(n * 100) / 100);
}
