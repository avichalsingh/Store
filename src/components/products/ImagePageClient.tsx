"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/catalog/useCatalog";
import { ImageGallery } from "@/components/products/image-pdp/ImageGallery";
import { ImageBuyColumn } from "@/components/products/image-pdp/ImageBuyColumn";
import { CollectionBrowseModal } from "@/components/products/image-pdp/CollectionBrowseModal";
import { CatalogProductCard } from "@/components/products/CatalogProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { DealPath } from "@/components/products/image-pdp/ImageBuildYourDeal";
import {
  getCollectionMemberProducts,
  resolveDealGallery,
  type CatalogLike,
} from "@/lib/imageDealGallery";
import type { AiImageProductPublic } from "@/types";

export function ImagePageClient({ slug }: { slug: string }) {
  const catalog = useCatalog();
  const product = catalog.getProductBySlug(slug);

  const [dealPath, setDealPath] = useState<DealPath | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [browseOpen, setBrowseOpen] = useState(false);

  const image =
    product && product.productType === "AI_IMAGE"
      ? (product as AiImageProductPublic)
      : null;

  useEffect(() => {
    if (image?.id) {
      setSelectedIds([image.id]);
      setDealPath(null);
    }
  }, [image?.id]);

  const galleryState = useMemo(() => {
    if (!image || !catalog.hydrated) {
      return { items: [], label: "YOUR IMAGES · 0 SELECTED", mode: "selected" as const };
    }
    return resolveDealGallery(dealPath, selectedIds, image, catalog as CatalogLike);
  }, [dealPath, selectedIds, image, catalog]);

  const collectionMembers = useMemo(() => {
    if (!image || !catalog.hydrated) return [];
    return getCollectionMemberProducts(catalog as CatalogLike, image);
  }, [image, catalog]);

  const hasCollection = collectionMembers.length > 1;

  const includedProductIds = useMemo(() => {
    if (dealPath === "collection") {
      return new Set(collectionMembers.map((p) => p.id));
    }
    return new Set(selectedIds);
  }, [dealPath, selectedIds, collectionMembers]);

  const handleAddToDeal = (productId: string) => {
    setDealPath("custom");
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev : [...prev, productId],
    );
  };

  const handleSelectFullCollection = () => {
    setDealPath("collection");
  };

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!image) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold">Image not found</h1>
        <p className="mt-2 text-muted">
          This product may be draft or removed from the catalog.
        </p>
        <Link
          href="/images"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Browse images
        </Link>
      </div>
    );
  }

  const moreImages = catalog
    .getProductsByType("AI_IMAGE")
    .filter((p) => p.id !== image.id && !p.slug.endsWith("-collection"))
    .slice(0, 4);

  const collectionTitle =
    image.imageCollection?.name ??
    image.packUpgrade?.title ??
    "This collection";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-12">
        <div
          className="w-full lg:sticky lg:top-24 lg:self-start"
          style={{ ["--pdp-chrome" as string]: "12.5rem" }}
        >
          <div className="mx-auto w-full max-w-md space-y-3 lg:mx-0 lg:max-w-none">
            <ImageGallery
              items={galleryState.items}
              title={image.title}
              headerLabel={galleryState.label}
              mode={galleryState.mode}
            />
            {hasCollection ? (
              <button
                type="button"
                onClick={() => setBrowseOpen(true)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-accent transition hover:border-accent/40 hover:bg-accent/[0.04]"
              >
                Browse collection →
                <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted">
                  See all {collectionMembers.length} images in “{collectionTitle}”
                  — separate from your selected deal
                </span>
              </button>
            ) : null}
          </div>
        </div>
        <ImageBuyColumn
          product={image}
          dealPath={dealPath}
          onDealPathChange={setDealPath}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onBrowseCollection={() => setBrowseOpen(true)}
        />
      </div>

      {hasCollection ? (
        <CollectionBrowseModal
          open={browseOpen}
          onClose={() => setBrowseOpen(false)}
          title={collectionTitle}
          products={collectionMembers}
          includedProductIds={includedProductIds}
          onAddToDeal={handleAddToDeal}
          onSelectFullCollection={handleSelectFullCollection}
        />
      ) : null}

      {moreImages.length > 0 ? (
        <section className="mt-20">
          <SectionHeader title="More images" href="/images" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {moreImages.map((p) => (
              <CatalogProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
