"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr, formatUsd } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import { getProductTypeConfig } from "@/catalog/productTypes";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, X } from "lucide-react";
import { useState } from "react";

export function BundleContentGrid({
  productIds,
  products,
  onReorder,
  onRemove,
  onAddProducts,
}: {
  productIds: string[];
  products: AdminProduct[];
  onReorder: (next: string[]) => void;
  onRemove: (id: string) => void;
  onAddProducts?: () => void;
}) {
  const { mediaAssets } = useAdmin();
  const [dragId, setDragId] = useState<string | null>(null);
  const map = new Map(products.map((p) => [p.id, p]));

  const move = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const next = [...productIds];
    const from = next.indexOf(fromId);
    const to = next.indexOf(toId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    onReorder(next);
  };

  if (!productIds.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-6 py-14 text-center">
        <p className="text-sm font-semibold text-[var(--admin-text)]">
          No products in this bundle yet
        </p>
        <p className="max-w-sm text-xs text-[var(--admin-muted)]">
          Add videos, images, caption packs, or other products to build a
          commercial bundle offer.
        </p>
        {onAddProducts ? (
          <AdminButton variant="primary" size="sm" onClick={onAddProducts}>
            <Plus className="h-3.5 w-3.5" />
            Add products
          </AdminButton>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {productIds.map((id) => {
        const p = map.get(id);
        if (!p) return null;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) move(dragId, id);
              setDragId(null);
            }}
            onDragEnd={() => setDragId(null)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-sm)] transition duration-200",
              dragId === id && "opacity-60",
              "cursor-grab hover:-translate-y-0.5 hover:shadow-[var(--admin-shadow-md)] active:cursor-grabbing",
            )}
          >
            <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
              <span className="rounded-lg bg-black/45 p-1 text-white backdrop-blur-sm">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            </div>
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onRemove(id)}
              className="absolute right-2 top-2 z-10 rounded-lg bg-black/45 p-1 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-[var(--admin-danger)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="relative aspect-[3/4] bg-[var(--admin-surface-2)]">
              <AdminThumb
                src={resolveProductThumbnail(p, mediaAssets)}
                alt=""
                sizes="220px"
                rounded="rounded-none"
              />
            </div>
            <div className="space-y-1.5 p-3">
              <p className="truncate text-sm font-semibold text-[var(--admin-text)]">
                {p.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge tone="neutral">
                  {getProductTypeConfig(p.productType).label}
                </AdminBadge>
                <span className="text-xs font-medium text-[var(--admin-text)]">
                  {formatInr(p.pricing.INR.currentPrice)}
                </span>
                <span className="text-xs text-[var(--admin-muted)]">
                  {formatUsd(p.pricing.USD.currentPrice)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
