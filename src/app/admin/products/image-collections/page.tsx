"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr, formatUsd } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import Link from "next/link";
import { useMemo } from "react";

type ImageCollectionRow = {
  id: string;
  name: string;
  slug: string;
  pack: AdminProduct;
  singles: AdminProduct[];
  cover: string;
};

function deriveImageCollections(products: AdminProduct[]): ImageCollectionRow[] {
  const packs = products.filter(
    (p) =>
      p.productType === "AI_IMAGE" &&
      p.aiImageData?.isCollectionPack &&
      p.aiImageData?.collectionId,
  );

  return packs
    .map((pack) => {
      const collectionId = pack.aiImageData!.collectionId!;
      const singles = products.filter(
        (p) =>
          p.productType === "AI_IMAGE" &&
          !p.aiImageData?.isCollectionPack &&
          p.aiImageData?.collectionId === collectionId,
      );
      const cover =
        pack.aiImageData?.images?.find((i) => i.isCover)?.previewUrl ||
        pack.aiImageData?.images?.find((i) => i.isCover)?.url ||
        pack.media.thumbnail ||
        "";
      const slug = pack.slug.replace(/-collection$/, "");
      return {
        id: collectionId,
        name: pack.aiImageData?.collectionName || pack.name,
        slug,
        pack,
        singles,
        cover,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function ImageCollectionsPage() {
  const { products, hydrated } = useAdmin();

  const collections = useMemo(
    () => deriveImageCollections(products),
    [products],
  );

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="AI image collections"
        description="Full-collection packs and their member singles. Edit pack pricing, images, and bundle metadata on each pack product."
        actions={
          <Link href="/admin/products?type=AI_IMAGE">
            <AdminButton variant="secondary">All AI images</AdminButton>
          </Link>
        }
      />

      {collections.length === 0 ? (
        <AdminEmptyState
          title="No image collections yet"
          description="Create an AI image pack product with isCollectionPack enabled, or use seeded marketplace collections."
        />
      ) : (
        <div className="space-y-4">
          {collections.map((col) => (
            <AdminCard key={col.id}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[var(--admin-surface-2)]">
                  <AdminThumb src={col.cover} alt="" sizes="80px" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
                    {col.name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--admin-muted)]">
                    {col.singles.length} singles · Pack slug: {col.pack.slug}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <span>
                      Bundle:{" "}
                      <span className="font-medium text-[var(--admin-accent)]">
                        {formatInr(col.pack.pricing.INR.currentPrice)}
                      </span>
                      {col.pack.pricing.INR.regularPrice >
                      col.pack.pricing.INR.currentPrice ? (
                        <>
                          {" "}
                          <span className="text-[var(--admin-muted)] line-through">
                            {formatInr(col.pack.pricing.INR.regularPrice)}
                          </span>
                        </>
                      ) : null}
                    </span>
                    <span className="text-[var(--admin-muted)]">
                      USD {formatUsd(col.pack.pricing.USD.currentPrice)}
                    </span>
                  </div>
                </div>
                <Link href={`/admin/products/${col.pack.id}/edit`}>
                  <AdminButton variant="primary" size="sm">
                    Edit pack
                  </AdminButton>
                </Link>
              </div>

              <ul className="mt-4 divide-y divide-[var(--admin-border)] rounded-xl border border-[var(--admin-border)]">
                {col.singles.map((single) => (
                  <li
                    key={single.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                        <AdminThumb
                          src={single.media.thumbnail}
                          alt=""
                          sizes="40px"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {single.name}
                        </p>
                        <p className="text-xs text-[var(--admin-muted)]">
                          /images/{single.slug}
                        </p>
                      </div>
                    </div>
                    <Link href={`/admin/products/${single.id}/edit`}>
                      <AdminButton size="sm" variant="secondary">
                        Edit
                      </AdminButton>
                    </Link>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
