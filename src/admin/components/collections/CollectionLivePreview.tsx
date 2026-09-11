"use client";

import { CollageCover } from "@/admin/components/collections/CollageCover";
import { resolveCollectionCoverUrl } from "@/admin/lib/collectionCover";
import { collectionHasPricing } from "@/admin/lib/collectionPricing";
import { formatInr, formatUsd } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminCollection, AdminProduct } from "@/admin/types";
import { Star } from "lucide-react";
import Image from "next/image";

export function CollectionLivePreview({
  collection,
  products,
}: {
  collection: AdminCollection;
  products: AdminProduct[];
}) {
  const { mediaAssets } = useAdmin();
  const coverUrl = resolveCollectionCoverUrl(collection, products, mediaAssets);
  const count = collection.productIds.length;
  const showCollage =
    collection.coverMode === "collage" && collection.coverLayout;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-sm)]">
      <div className="relative aspect-[4/3] w-full bg-[var(--admin-surface-2)]">
        {showCollage ? (
          <CollageCover
            layout={collection.coverLayout}
            slots={collection.coverSlots}
            products={products}
            mediaAssets={mediaAssets}
            rounded={false}
            className="absolute inset-0 h-full w-full rounded-none"
          />
        ) : coverUrl.startsWith("blob:") || coverUrl.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="320px"
          />
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-[family-name:var(--font-syne)] text-base font-semibold text-[var(--admin-text)]">
          {collection.name || "Untitled collection"}
        </p>
        <p className="text-xs text-[var(--admin-muted)]">
          {count} trending {count === 1 ? "video" : "videos"}
        </p>
        {collectionHasPricing(collection.pricing) ? (
          <p className="text-xs text-[var(--admin-muted)]">
            {formatInr(collection.pricing!.INR.currentPrice)} ·{" "}
            {formatUsd(collection.pricing!.USD.currentPrice)}
          </p>
        ) : null}
        {collection.featured ? (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-[var(--admin-accent)]">
            <Star className="h-3.5 w-3.5 fill-current" />
            Featured
          </p>
        ) : null}
      </div>
    </div>
  );
}
