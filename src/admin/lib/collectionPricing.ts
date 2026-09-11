import type {
  AdminCollection,
  AdminCollectionOffer,
  AdminCollectionPricing,
} from "@/admin/types";
import type { Collection, LaunchOffer, ProductPricing } from "@/types";

export function emptyCollectionPricing(): AdminCollectionPricing {
  return {
    INR: { regularPrice: 0, currentPrice: 0 },
    USD: { regularPrice: 0, currentPrice: 0 },
  };
}

export function emptyCollectionOffer(): AdminCollectionOffer {
  return { enabled: false, label: "" };
}

function clampCurrent(regular: number, current: number): number {
  const safeRegular = Math.max(0, regular);
  const safeCurrent = Math.max(0, current);
  if (!safeRegular) return safeCurrent;
  return Math.min(safeCurrent, safeRegular);
}

export function normalizeCollectionPricing(
  pricing?: AdminCollectionPricing,
): AdminCollectionPricing {
  const base = pricing ?? emptyCollectionPricing();
  const inrRegular = Math.max(0, base.INR?.regularPrice ?? 0);
  const usdRegular = Math.max(0, base.USD?.regularPrice ?? 0);
  return {
    INR: {
      regularPrice: inrRegular,
      currentPrice: clampCurrent(inrRegular, base.INR?.currentPrice ?? 0),
    },
    USD: {
      regularPrice: usdRegular,
      currentPrice: clampCurrent(usdRegular, base.USD?.currentPrice ?? 0),
    },
  };
}

export function normalizeCollectionOffer(
  offer?: AdminCollectionOffer,
): AdminCollectionOffer {
  return {
    enabled: Boolean(offer?.enabled),
    label: offer?.label ?? "",
    startDate: offer?.startDate,
    endDate: offer?.endDate,
  };
}

export function collectionPricingErrors(
  pricing: AdminCollectionPricing,
): string[] {
  const errors: string[] = [];
  if (
    pricing.INR.regularPrice > 0 &&
    pricing.INR.currentPrice > pricing.INR.regularPrice
  ) {
    errors.push("INR current price cannot exceed regular price.");
  }
  if (
    pricing.USD.regularPrice > 0 &&
    pricing.USD.currentPrice > pricing.USD.regularPrice
  ) {
    errors.push("USD current price cannot exceed regular price.");
  }
  return errors;
}

export function collectionHasPricing(pricing?: AdminCollectionPricing): boolean {
  return (
    (pricing?.INR?.regularPrice ?? 0) > 0 ||
    (pricing?.USD?.regularPrice ?? 0) > 0
  );
}

export function collectionOfferCountdown(end?: string) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `${d}d ${h}h remaining`;
}

const LEGACY_FALLBACK = {
  price: 39.99,
  originalPrice: 59.99,
};

export function collectionToStorefrontPricing(collection: AdminCollection): {
  price: number;
  originalPrice: number;
  pricing: ProductPricing;
  offer?: LaunchOffer;
} {
  const pricing = normalizeCollectionPricing(collection.pricing);
  const offer = normalizeCollectionOffer(collection.offer);

  if (!collectionHasPricing(pricing)) {
    const fallbackUsd = LEGACY_FALLBACK.price;
    const fallbackRegular = LEGACY_FALLBACK.originalPrice;
    return {
      price: fallbackUsd,
      originalPrice: fallbackRegular,
      pricing: {
        india: {
          regularPrice: Math.round(fallbackRegular * 83),
          salePrice: Math.round(fallbackUsd * 83),
        },
        international: {
          regularPrice: fallbackRegular,
          salePrice: fallbackUsd,
        },
      },
      offer: offer.enabled
        ? {
            enabled: true,
            label: offer.label || "COLLECTION OFFER",
            discountText: offer.label || "SALE",
            endDate: offer.endDate,
          }
        : undefined,
    };
  }

  const usdRegular = pricing.USD.regularPrice;
  const usdCurrent = pricing.USD.currentPrice;
  const inrRegular = pricing.INR.regularPrice;
  const inrCurrent = pricing.INR.currentPrice;

  const price = usdCurrent || usdRegular;
  const originalPrice = usdRegular || price;

  return {
    price,
    originalPrice,
    pricing: {
      india: {
        regularPrice: inrRegular || Math.round(originalPrice * 83),
        salePrice: inrCurrent || inrRegular || Math.round(price * 83),
      },
      international: {
        regularPrice: usdRegular || price,
        salePrice: usdCurrent || usdRegular || price,
      },
    },
    offer: offer.enabled
      ? {
          enabled: true,
          label: offer.label || "COLLECTION OFFER",
          discountText: offer.label || "SALE",
          endDate: offer.endDate,
        }
      : undefined,
  };
}
