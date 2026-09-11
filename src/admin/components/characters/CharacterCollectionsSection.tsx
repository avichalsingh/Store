"use client";

import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { resolveCollectionCoverUrl } from "@/admin/lib/collectionCover";
import type { AdminCollection, AdminProduct } from "@/admin/types";
import { FolderOpen, LayoutGrid } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function CharacterCollectionsSection({
  characterName,
  characterId,
  collections,
  products,
}: {
  characterName: string;
  characterId: string;
  collections: AdminCollection[];
  products: AdminProduct[];
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-syne)] text-base font-semibold">
            Collections
          </h2>
          <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
            Derived from collections that include this character&apos;s
            products.
          </p>
        </div>
        <Link href="/admin/collections">
          <AdminButton variant="secondary" size="sm">
            <LayoutGrid className="h-3.5 w-3.5" />
            Manage Collections
          </AdminButton>
        </Link>
      </div>

      {!collections.length ? (
        <AdminEmptyState
          icon={FolderOpen}
          title="No collections currently feature this character."
          description="When this character's products appear in a collection, it will show up here."
          action={
            <Link href="/admin/collections">
              <AdminButton variant="secondary" size="sm">
                Manage Collections
              </AdminButton>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {collections.map((c) => {
            const cover = resolveCollectionCoverUrl(c, products);
            const charProductCount = c.productIds.filter((id) =>
              products.some(
                (p) => p.id === id && p.characterId === characterId,
              ),
            ).length;
            const isBlob =
              cover.startsWith("blob:") || cover.startsWith("data:");
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] transition hover:border-[var(--admin-accent)]/40"
              >
                <div className="relative h-28 w-full bg-[var(--admin-surface-2)]">
                  {isBlob ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="320px"
                    />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">
                      {c.name}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-[var(--admin-muted)]">
                    {charProductCount} {characterName || "character"} product
                    {charProductCount === 1 ? "" : "s"} inside
                  </p>
                  <Link href={`/admin/collections/${c.id}`}>
                    <AdminButton variant="ghost" size="sm">
                      Open Collection
                    </AdminButton>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
