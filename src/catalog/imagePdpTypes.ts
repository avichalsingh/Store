/** Shared Image PDP deal/pricing types (CMS + storefront). */

export type ImagePdpPricingTier = {
  /** Minimum selected image count for this tier (inclusive). */
  minQuantity: number;
  perImageInr?: number;
  perImageUsd?: number;
  /** Optional admin label, e.g. "Best value band". */
  label?: string;
};

export type ImagePdpDealSettings = {
  /** Show GET THE FULL COLLECTION on PDP (default true). */
  enableFullCollection?: boolean;
  /** Show ADD MORE IMAGES & SAVE MORE (default true). */
  enableAddMoreImages?: boolean;
  /** Badge on full collection option, e.g. BEST VALUE */
  collectionBadgeText?: string;
  /** Image count at or above which badge becomes MASSIVE COLLECTION DEAL unless overridden. */
  massiveCollectionThreshold?: number;
};

export type ImageCollectionBundleMeta = {
  /** Display compare-at total for full collection (INR). Falls back to pack regular price. */
  compareAtInr?: number;
  compareAtUsd?: number;
  badgeText?: string;
};

export type ImagePdpGlobalSettings = {
  /** Default progressive pricing tiers for library-wide custom bundles. */
  pricingTiers: ImagePdpPricingTier[];
  dealDefaults: ImagePdpDealSettings;
};

export const DEFAULT_IMAGE_PDP_TIERS: ImagePdpPricingTier[] = [
  { minQuantity: 1, perImageInr: 799, perImageUsd: 9.99 },
  { minQuantity: 2, perImageInr: 499, perImageUsd: 6.49 },
  { minQuantity: 3, perImageInr: 449, perImageUsd: 5.49 },
  { minQuantity: 4, perImageInr: 399, perImageUsd: 4.99 },
  { minQuantity: 5, perImageInr: 349, perImageUsd: 4.49 },
  { minQuantity: 8, perImageInr: 299, perImageUsd: 3.99 },
  { minQuantity: 13, perImageInr: 249, perImageUsd: 3.49 },
];

export function defaultImagePdpGlobalSettings(): ImagePdpGlobalSettings {
  return {
    pricingTiers: structuredClone(DEFAULT_IMAGE_PDP_TIERS),
    dealDefaults: {
      enableFullCollection: true,
      enableAddMoreImages: true,
      collectionBadgeText: "BEST VALUE",
      massiveCollectionThreshold: 12,
    },
  };
}

export function resolvePricingTiers(
  productTiers: ImagePdpPricingTier[] | undefined,
  globalTiers: ImagePdpPricingTier[],
): ImagePdpPricingTier[] {
  if (productTiers?.length) return productTiers;
  return globalTiers.length ? globalTiers : DEFAULT_IMAGE_PDP_TIERS;
}

export function resolveDealSettings(
  productSettings: ImagePdpDealSettings | undefined,
  globalDefaults: ImagePdpDealSettings,
): Required<
  Pick<
    ImagePdpDealSettings,
    | "enableFullCollection"
    | "enableAddMoreImages"
    | "collectionBadgeText"
    | "massiveCollectionThreshold"
  >
> {
  return {
    enableFullCollection:
      productSettings?.enableFullCollection ??
      globalDefaults.enableFullCollection ??
      true,
    enableAddMoreImages:
      productSettings?.enableAddMoreImages ??
      globalDefaults.enableAddMoreImages ??
      true,
    collectionBadgeText:
      productSettings?.collectionBadgeText ??
      globalDefaults.collectionBadgeText ??
      "BEST VALUE",
    massiveCollectionThreshold:
      productSettings?.massiveCollectionThreshold ??
      globalDefaults.massiveCollectionThreshold ??
      12,
  };
}
