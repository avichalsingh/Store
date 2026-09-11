"use client";

import { CollageCover } from "@/admin/components/collections/CollageCover";
import { formatInr, formatUsd } from "@/admin/lib/format";
import { computeBundleTotals } from "@/admin/lib/bundleHelpers";
import {
  normalizeBundleCoverData,
  resolveBundleCoverUrl,
} from "@/admin/lib/bundleCover";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import type {
  CollectionCollageLayout,
  CollectionCoverSlot,
} from "@/admin/types";
import { Star, TrendingUp } from "lucide-react";
import Image from "next/image";

export function BundleLivePreview({
  draft,
  includedProducts,
  allProducts,
}: {
  draft: AdminProduct;
  includedProducts: AdminProduct[];
  allProducts: AdminProduct[];
}) {
  const { mediaAssets } = useAdmin();
  const totals = computeBundleTotals(draft, includedProducts);
  const bundle = normalizeBundleCoverData(draft.bundleData);
  const coverUrl = resolveBundleCoverUrl(draft, allProducts, mediaAssets);
  const isCollage = bundle.coverMode === "collage";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-sm)]">
      <div className="relative aspect-[4/3] w-full bg-[var(--admin-surface-2)]">
        {isCollage ? (
          <CollageCover
            layout={(bundle.coverLayout ?? "four-grid") as CollectionCollageLayout}
            slots={(bundle.coverSlots ?? []) as CollectionCoverSlot[]}
            products={allProducts}
            mediaAssets={mediaAssets}
            rounded={false}
            className="absolute inset-0 rounded-none"
          />
        ) : coverUrl &&
          (coverUrl.startsWith("blob:") || coverUrl.startsWith("data:")) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="320px"
          />
        ) : (
          <AdminThumb
            src=""
            alt=""
            sizes="320px"
            rounded="rounded-none"
          />
        )}
        {includedProducts.length > 0 ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/85">
              {includedProducts.length} products included
            </p>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-[family-name:var(--font-syne)] text-base font-semibold text-[var(--admin-text)]">
          {draft.name || "Untitled bundle"}
        </p>
        <p className="text-xs text-[var(--admin-muted)]">
          {formatInr(draft.pricing.INR.currentPrice)} ·{" "}
          {formatUsd(draft.pricing.USD.currentPrice)}
        </p>
        {totals.inr > 0 ? (
          <p className="text-xs text-[var(--admin-accent)]">
            Saves {formatInr(totals.saveInr)} / {formatUsd(totals.saveUsd)} vs
            individual
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {draft.isFeatured ? (
            <p className="inline-flex items-center gap-1 text-xs font-medium text-[var(--admin-accent)]">
              <Star className="h-3.5 w-3.5 fill-current" />
              Featured
            </p>
          ) : null}
          {draft.isTrending ? (
            <p className="inline-flex items-center gap-1 text-xs font-medium text-[var(--admin-accent)]">
              <TrendingUp className="h-3.5 w-3.5" />
              Trending
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
