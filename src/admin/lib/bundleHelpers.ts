import type { AdminProduct } from "@/admin/types";
import type { ProductRelationship } from "@/catalog/productPayloads";
import { emptyBundleData } from "@/catalog/productPayloads";
import { uid } from "@/admin/lib/format";

export function getBundleIncludedIds(draft: AdminProduct): string[] {
  const fromRels = (draft.relationships ?? [])
    .filter((r) => r.relationshipType === "INCLUDED_IN_BUNDLE")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => r.relatedProductId);
  if (fromRels.length > 0) return fromRels;
  return draft.bundleData?.includedProductIds ?? [];
}

export function syncBundleIncludes(
  draft: AdminProduct,
  includedIds: string[],
): AdminProduct {
  const otherRels = (draft.relationships ?? []).filter(
    (r) => r.relationshipType !== "INCLUDED_IN_BUNDLE",
  );
  const includedRels: ProductRelationship[] = includedIds.map((id, i) => {
    const existing = (draft.relationships ?? []).find(
      (r) =>
        r.relationshipType === "INCLUDED_IN_BUNDLE" &&
        r.relatedProductId === id,
    );
    return {
      id: existing?.id ?? uid("rel"),
      relatedProductId: id,
      relationshipType: "INCLUDED_IN_BUNDLE",
      sortOrder: i,
      customPriceInr: existing?.customPriceInr,
      customPriceUsd: existing?.customPriceUsd,
    };
  });
  return {
    ...draft,
    relationships: [...otherRels, ...includedRels],
    bundleData: {
      ...(draft.bundleData ?? emptyBundleData()),
      includedProductIds: includedIds,
    },
  };
}

export function computeBundleTotals(
  draft: AdminProduct,
  includedProducts: AdminProduct[],
) {
  const inr = includedProducts.reduce(
    (sum, p) => sum + (p.pricing?.INR?.currentPrice ?? 0),
    0,
  );
  const usd = includedProducts.reduce(
    (sum, p) => sum + (p.pricing?.USD?.currentPrice ?? 0),
    0,
  );
  return {
    inr,
    usd,
    saveInr: Math.max(0, inr - (draft.pricing?.INR?.currentPrice ?? 0)),
    saveUsd: Math.max(0, usd - (draft.pricing?.USD?.currentPrice ?? 0)),
  };
}

export function offerCountdown(end?: string) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `${d}d ${h}h remaining`;
}
