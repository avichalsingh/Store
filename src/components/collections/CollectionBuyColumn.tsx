"use client";

import { useRouter } from "next/navigation";
import type { Collection } from "@/types";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { getCollectionQuote } from "@/lib/pricing";
import { LaunchOfferCard } from "@/components/products/LaunchOfferCard";
import { TrendCta } from "@/components/ui/TrendCta";
import { AddToCartButton } from "@/components/ui/AddToCartButton";

export function CollectionBuyColumn({
  collection,
  videoCount,
}: {
  collection: Collection;
  videoCount: number;
}) {
  const { region } = useRegion();
  const quote = getCollectionQuote(collection, region);
  const { addCollection, items } = useCart();
  const router = useRouter();

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Collection
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {collection.title}
      </h1>
      <p className="text-base leading-relaxed text-muted">
        {collection.description}
      </p>
      <p className="text-sm text-text-dim">
        {videoCount} videos included
        {collection.exclusiveCount
          ? ` · ${collection.exclusiveCount} exclusive`
          : ""}
      </p>
      {collection.socialProofText && (
        <p className="text-sm font-medium text-accent">
          {collection.socialProofText}
        </p>
      )}

      <LaunchOfferCard quote={quote} offer={collection.offer} />

      <TrendCta
        onClick={() => {
          if (!items.some((i) => i.productId === collection.id)) {
            addCollection(collection, undefined, { open: false });
          }
          router.push("/checkout");
        }}
        microcopy="Best value for creators"
      >
        Unlock the full collection
      </TrendCta>
      <AddToCartButton
        collection={collection}
        variant="ghost"
        label="Add to My Collection"
        className="w-full"
      />
    </div>
  );
}
