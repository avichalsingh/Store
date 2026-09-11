"use client";

import { CollageCover } from "@/admin/components/collections/CollageCover";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import {
  normalizeCollection,
  resolveCollectionCoverUrl,
} from "@/admin/lib/collectionCover";
import { useAdmin } from "@/admin/store/AdminProvider";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CollectionsPage() {
  const router = useRouter();
  const { collections, products, mediaAssets, hydrated } = useAdmin();

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="Collections"
        description="Organize related products for browsing and discovery. Separate from Bundles (commercial packages)."
        actions={
          <Link href="/admin/collections/new">
            <AdminButton variant="primary">New collection</AdminButton>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((raw) => {
          const c = normalizeCollection(raw);
          const coverUrl = resolveCollectionCoverUrl(c, products, mediaAssets);
          const showCollage = c.coverMode === "collage" && c.coverLayout;

          return (
            <div
              key={c.id}
              className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] text-left shadow-[var(--admin-shadow-sm)] transition hover:border-[var(--admin-accent)]/40"
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => router.push(`/admin/collections/${c.id}`)}
              >
                <div className="relative h-36 w-full bg-[var(--admin-surface-2)]">
                  {showCollage ? (
                    <CollageCover
                      layout={c.coverLayout}
                      slots={c.coverSlots}
                      products={products}
                      mediaAssets={mediaAssets}
                      rounded={false}
                      className="absolute inset-0 rounded-none"
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
                      sizes="400px"
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-[family-name:var(--font-syne)] font-semibold">
                      {c.name}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--admin-muted)]">
                    {c.description}
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--admin-muted)]">
                    {c.productIds.length} products
                    {c.featured ? " · Featured" : ""}
                  </p>
                </div>
              </button>
              <div className="border-t border-[var(--admin-border)] px-4 py-2.5">
                <Link href={`/admin/collections/${c.id}`}>
                  <AdminButton variant="ghost" size="sm">
                    Edit
                  </AdminButton>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
