import type {
  CatalogProduct,
  Collection,
  LaunchOffer,
  PriceQuote,
  ProductPricing,
  Region,
  RegionalPrice,
  VideoProduct,
} from "@/types";

export const REGION_STORAGE_KEY = "rhythm-region";

/** Sync heuristic: timezone + browser locale (India → INR, else USD). */
export function detectRegion(): Region {
  if (typeof window === "undefined") return "international";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "india";

    const languages = [
      navigator.language,
      ...(navigator.languages ?? []),
    ].filter(Boolean);

    if (
      languages.some(
        (lang) =>
          lang === "hi-IN" ||
          lang === "en-IN" ||
          /(^|-)IN$/i.test(lang),
      )
    ) {
      return "india";
    }
  } catch {
    /* ignore */
  }
  return "international";
}

/**
 * Prefer IP country when available; fall back to timezone/locale.
 * Used once on load so visitors in India always see INR without a toggle.
 */
export async function detectRegionFromLocation(): Promise<Region> {
  if (typeof window === "undefined") return "international";

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    const res = await fetch("https://ipapi.co/country_code/", {
      signal: controller.signal,
      cache: "no-store",
    });
    window.clearTimeout(timer);
    if (res.ok) {
      const code = (await res.text()).trim().toUpperCase();
      if (code === "IN") return "india";
      if (code.length === 2) return "international";
    }
  } catch {
    /* offline / blocked — use heuristic */
  }

  return detectRegion();
}

export function isOfferLive(offer?: LaunchOffer, now = Date.now()) {
  if (!offer?.enabled) return false;
  if (!offer.endDate) return true;
  const end = new Date(offer.endDate).getTime();
  if (Number.isNaN(end)) return true;
  return end > now;
}

export function getQuote(
  pricing: ProductPricing | undefined,
  offer: LaunchOffer | undefined,
  region: Region,
  fallbackUsd = 0
): PriceQuote {
  const tier = pricing?.[region];
  const regular = tier?.regularPrice ?? fallbackUsd;
  const sale = tier?.salePrice ?? fallbackUsd;
  const live = isOfferLive(offer) && sale < regular;
  const current = live ? sale : regular;
  const discountPct =
    regular > current ? Math.round(((regular - current) / regular) * 100) : 0;
  return {
    current,
    regular,
    saleActive: live,
    discountPct,
    label: live ? offer?.label : undefined,
    endDate: live ? offer?.endDate : undefined,
    discountText: live ? offer?.discountText : undefined,
  };
}

export function getVideoQuote(video: VideoProduct, region: Region) {
  return getQuote(video.pricing, video.offer, region, video.price);
}

export function getCatalogProductQuote(
  product: CatalogProduct,
  region: Region,
) {
  return getQuote(product.pricing, product.offer, region, product.price);
}

export function getCollectionQuote(collection: Collection, region: Region) {
  return getQuote(
    collection.pricing,
    collection.offer,
    region,
    collection.price
  );
}

export function formatPrice(amount: number, region: Region) {
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

export function regionLabel(region: Region) {
  return region === "india" ? "India · INR" : "International · USD";
}

export function getCurrentRegion(): Region {
  return detectRegion();
}

export function setRegion(_region: Region) {
  // Manual region selection removed — pricing is automatic by location.
}

export function getRegionalPrice(
  pricing: ProductPricing | undefined,
  region: Region,
  fallback = 0
): RegionalPrice {
  return (
    pricing?.[region] ?? {
      regularPrice: fallback,
      salePrice: fallback,
    }
  );
}

export const PRICE_FILTER_BOUNDS: Record<
  Region,
  { min: number; max: number; step: number }
> = {
  india: { min: 199, max: 999, step: 50 },
  international: { min: 9, max: 50, step: 1 },
};
