import type { ImagePdpPricingTier } from "@/catalog/imagePdpTypes";
import { DEFAULT_IMAGE_PDP_TIERS } from "@/catalog/imagePdpTypes";
import type { Region } from "@/types";

export type DealQuote = {
  count: number;
  total: number;
  compare: number;
  save: number;
  perImage: number;
  nextCount: number | null;
  nextPerImage: number | null;
  nextTotal: number | null;
  nextSave: number | null;
  tierLabel: string | null;
};

function resolveTierList(tiers?: ImagePdpPricingTier[]): ImagePdpPricingTier[] {
  return tiers?.length ? tiers : DEFAULT_IMAGE_PDP_TIERS;
}

/** Per-image rate from CMS pricing tiers. */
function perImageRate(
  count: number,
  singleSale: number,
  region: Region,
  tiers?: ImagePdpPricingTier[],
): number {
  if (count <= 0) return singleSale;
  const list = resolveTierList(tiers);
  const sorted = [...list].sort((a, b) => b.minQuantity - a.minQuantity);
  for (const tier of sorted) {
    if (count >= tier.minQuantity) {
      const rate = region === "india" ? tier.perImageInr : tier.perImageUsd;
      if (rate != null && rate > 0) return roundMoney(rate, region);
    }
  }
  return singleSale;
}

function nextTierMilestone(
  count: number,
  tiers: ImagePdpPricingTier[],
): number | null {
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  for (const tier of sorted) {
    if (tier.minQuantity > count) return tier.minQuantity;
  }
  return null;
}

export function roundMoney(n: number, region: Region) {
  if (region === "india") return Math.max(1, Math.round(n));
  return Math.max(0.5, Math.round(n * 100) / 100);
}

/** Total for N images using progressive per-image tiers from CMS. */
export function customDealPrice(
  count: number,
  singleSale: number,
  region: Region,
  tiers?: ImagePdpPricingTier[],
) {
  return getDealQuote(count, singleSale, region, tiers).total;
}

export function customDealCompare(
  count: number,
  singleSale: number,
  region: Region,
) {
  if (count <= 0) return 0;
  return roundMoney(singleSale * count, region);
}

export function getDealQuote(
  count: number,
  singleSale: number,
  region: Region,
  tiers?: ImagePdpPricingTier[],
): DealQuote {
  const list = resolveTierList(tiers);

  if (count <= 0) {
    const firstMilestone = nextTierMilestone(0, list) ?? 1;
    const nextRate = perImageRate(firstMilestone, singleSale, region, list);
    const nextTotal = roundMoney(nextRate * firstMilestone, region);
    return {
      count: 0,
      total: 0,
      compare: 0,
      save: 0,
      perImage: 0,
      nextCount: firstMilestone,
      nextPerImage: nextRate,
      nextTotal,
      nextSave: 0,
      tierLabel: nextTierLabel(0, firstMilestone, nextRate, region),
    };
  }

  const rate = perImageRate(count, singleSale, region, list);
  const total = roundMoney(rate * count, region);
  const compare = roundMoney(singleSale * count, region);
  const save = Math.max(0, compare - total);
  const perImage = rate;

  const nextMilestone = nextTierMilestone(count, list);
  const nextCount = nextMilestone ?? count + 1;
  const nextRate = perImageRate(nextCount, singleSale, region, list);
  const nextTotal = roundMoney(nextRate * nextCount, region);
  const nextCompare = roundMoney(singleSale * nextCount, region);

  return {
    count,
    total,
    compare,
    save,
    perImage,
    nextCount: nextMilestone ?? count + 1,
    nextPerImage: nextRate,
    nextTotal,
    nextSave: Math.max(0, nextCompare - nextTotal),
    tierLabel: nextTierLabel(count, nextCount, nextRate, region),
  };
}

function nextTierLabel(
  count: number,
  nextCount: number,
  nextPerImage: number,
  region: Region,
): string | null {
  const add = nextCount - count;
  if (add <= 0) return null;
  const formatted = formatPerImage(nextPerImage, region);
  if (add === 1) return `Add 1 more → unlock ${formatted}/image`;
  return `Add ${add} more → unlock ${formatted}/image`;
}

export function dealMotivationMessage(
  count: number,
  region: Region,
  singleSale: number,
  tiers?: ImagePdpPricingTier[],
): string | null {
  if (count <= 0) return null;
  const list = resolveTierList(tiers);
  const nextMilestone = nextTierMilestone(count, list);
  const nextCount = nextMilestone ?? count + 1;
  const next = getDealQuote(nextCount, singleSale, region, tiers);
  const nextPer = formatPerImage(next.perImage, region);
  const add = nextCount - count;

  if (count === 1) {
    return "Add another image to unlock a better price →";
  }
  if (add === 1 && count === 2) {
    return `🔥 Nice! Add 1 more to drop your price to ${nextPer}/image.`;
  }
  if (add === 1 && count === 3) {
    return `🔥 Almost there! Add 1 more and pay only ${nextPer}/image.`;
  }
  if (add === 1 && count === 4) {
    return `🔥 Great deal unlocked! Add another and drop to ${nextPer}/image.`;
  }
  if (add > 1) {
    return `🔥 Add ${add} more to unlock ${nextPer}/image.`;
  }
  if (count <= 7) {
    return `🔥 Strong bundle! Add 1 more to reach ${nextPer}/image.`;
  }
  return "🔥 You're getting the best price per image yet.";
}

export function nextTierUpsellStrip(
  count: number,
  region: Region,
  singleSale: number,
  tiers?: ImagePdpPricingTier[],
): string | null {
  if (count < 1) return null;
  const list = resolveTierList(tiers);
  const nextMilestone = nextTierMilestone(count, list);
  const nextCount = nextMilestone ?? count + 1;
  const next = getDealQuote(nextCount, singleSale, region, tiers);
  const nextPer = formatPerImage(next.perImage, region);
  const add = nextCount - count;
  const extraSave = Math.max(
    0,
    next.save - getDealQuote(count, singleSale, region, tiers).save,
  );
  const addLabel = add === 1 ? "ADD 1 MORE" : `ADD ${add} MORE`;
  if (extraSave > 0 && count >= 2) {
    return `${addLabel} → UNLOCK ${nextPer}/IMAGE · SAVE ${formatPerImage(extraSave, region)} MORE`;
  }
  return `${addLabel} → UNLOCK ${nextPer}/IMAGE`;
}

export function formatPerImage(amount: number, region: Region) {
  if (region === "india") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function distributeLinePrices(
  total: number,
  unitPrices: number[],
  region: Region,
) {
  const sum = unitPrices.reduce((s, p) => s + p, 0);
  if (sum <= 0) return unitPrices.map(() => roundMoney(total, region));
  const lines = unitPrices.map((p) => roundMoney((total * p) / sum, region));
  const drift = roundMoney(total, region) - lines.reduce((s, p) => s + p, 0);
  if (drift !== 0 && lines.length) lines[0] = roundMoney(lines[0]! + drift, region);
  return lines;
}

/** @deprecated */
export type DealTierConfig = Record<string, never>;
