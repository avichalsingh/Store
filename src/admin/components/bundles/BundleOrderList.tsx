"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import { getProductTypeConfig } from "@/catalog/productTypes";
import { GripVertical } from "lucide-react";
import { useState } from "react";

export function BundleOrderList({
  productIds,
  products,
  onReorder,
}: {
  productIds: string[];
  products: AdminProduct[];
  onReorder: (next: string[]) => void;
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
      <p className="text-sm text-[var(--admin-muted)]">
        Add products to the bundle to set their order.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--admin-accent)]">
        Drag items to control bundle display order
      </p>
      <ol className="space-y-2">
        {productIds.map((id, index) => {
          const p = map.get(id);
          if (!p) return null;
          return (
            <li
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
              className={`flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 cursor-grab active:cursor-grabbing ${
                dragId === id ? "opacity-50" : ""
              }`}
            >
              <span className="w-5 text-center text-xs font-medium text-[var(--admin-muted)]">
                {index + 1}
              </span>
              <GripVertical className="h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
              <div className="relative h-9 w-7 shrink-0 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                <AdminThumb
                  src={resolveProductThumbnail(p, mediaAssets)}
                  alt=""
                  sizes="28px"
                  rounded="rounded-none"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-[11px] text-[var(--admin-muted)]">
                  {getProductTypeConfig(p.productType).label} ·{" "}
                  {formatInr(p.pricing.INR.currentPrice)}
                </p>
              </div>
              <AdminBadge tone="neutral">
                {getProductTypeConfig(p.productType).singular}
              </AdminBadge>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
