"use client";

import { AdminBadge, StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminModal";
import { formatInr } from "@/admin/lib/format";
import type { AdminCollection, AdminProduct } from "@/admin/types";
import { Plus, Trash2, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function CharacterProductsSection({
  characterName,
  products,
  collections,
  onAdd,
  onRemove,
}: {
  characterName: string;
  products: AdminProduct[];
  collections: AdminCollection[];
  onAdd: () => void;
  onRemove: (productId: string) => void;
}) {
  const [removeId, setRemoveId] = useState<string | null>(null);
  const removing = products.find((p) => p.id === removeId);

  const collectionNames = (product: AdminProduct) =>
    collections
      .filter((c) => c.productIds.includes(product.id))
      .map((c) => c.name);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-syne)] text-base font-semibold">
            Products & Videos
          </h2>
          <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
            Products assigned to {characterName || "this character"} ·{" "}
            {products.length} product{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <AdminButton variant="primary" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add Products
        </AdminButton>
      </div>

      {!products.length ? (
        <AdminEmptyState
          icon={Video}
          title="No products assigned yet"
          description="Add videos to this character. Removing a product only clears the assignment — it stays in your store."
          action={
            <AdminButton variant="primary" size="sm" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
              Add Products
            </AdminButton>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => {
            const names = collectionNames(p);
            const trending =
              p.performance?.status === "trending" ||
              p.performance?.status === "viral" ||
              p.isTrending;
            return (
              <div
                key={p.id}
                className="group flex gap-3 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 transition hover:border-[var(--admin-accent)]/40"
              >
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]"
                >
                  <Image
                    src={p.media.thumbnail || "/media/videos/pulse-drop.jpg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="line-clamp-1 font-medium hover:text-[var(--admin-accent)]"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={p.status} />
                    {trending ? (
                      <AdminBadge tone="accent">🔥 Trending</AdminBadge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[var(--admin-text)]">
                    {formatInr(p.pricing.INR.currentPrice)}
                  </p>
                  {names.length ? (
                    <p className="mt-0.5 truncate text-[11px] text-[var(--admin-muted)]">
                      {names.slice(0, 2).join(", ")}
                      {names.length > 2 ? "…" : ""}
                    </p>
                  ) : null}
                </div>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  aria-label="Remove from character"
                  onClick={() => setRemoveId(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-[var(--admin-danger)]" />
                </AdminButton>
              </div>
            );
          })}
        </div>
      )}

      <AdminConfirmDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        title={`Remove "${removing?.name ?? "product"}" from ${characterName || "this character"}?`}
        description="The product will remain in your store and Media Library. It will be reassigned to another character so every product keeps a valid character."
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (removeId) onRemove(removeId);
          setRemoveId(null);
        }}
      />
    </div>
  );
}
