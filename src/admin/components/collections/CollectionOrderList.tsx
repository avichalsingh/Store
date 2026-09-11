"use client";

import {
  AdminField,
  AdminSelect,
} from "@/admin/components/ui/AdminField";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct, CollectionSortMode } from "@/admin/types";
import { GripVertical } from "lucide-react";
import { useState } from "react";

const SORT_OPTIONS: { value: CollectionSortMode; label: string }[] = [
  { value: "custom", label: "Custom order" },
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most popular" },
  { value: "engagement", label: "Highest engagement" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function CollectionOrderList({
  productIds,
  products,
  sortMode,
  onSortModeChange,
  onReorder,
}: {
  productIds: string[];
  products: AdminProduct[];
  sortMode: CollectionSortMode;
  onSortModeChange: (mode: CollectionSortMode) => void;
  onReorder: (next: string[]) => void;
}) {
  const { mediaAssets } = useAdmin();
  const [dragId, setDragId] = useState<string | null>(null);
  const map = new Map(products.map((p) => [p.id, p]));
  const custom = sortMode === "custom";

  const move = (fromId: string, toId: string) => {
    if (!custom || fromId === toId) return;
    const next = [...productIds];
    const from = next.indexOf(fromId);
    const to = next.indexOf(toId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    onReorder(next);
  };

  return (
    <div className="space-y-4">
      <AdminField label="Sort mode" hint="Custom order lets you drag items manually.">
        <AdminSelect
          value={sortMode}
          onChange={(e) =>
            onSortModeChange(e.target.value as CollectionSortMode)
          }
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </AdminSelect>
      </AdminField>

      {custom ? (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--admin-accent)]">
          Custom order active
        </p>
      ) : (
        <p className="text-xs text-[var(--admin-muted)]">
          Order is computed automatically from the selected sort mode. Dragging
          an item switches back to Custom Order.
        </p>
      )}

      <ol className="space-y-2">
        {productIds.map((id, index) => {
          const p = map.get(id);
          if (!p) return null;
          return (
            <li
              key={id}
              draggable={custom}
              onDragStart={() => setDragId(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, id);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 ${
                custom ? "cursor-grab active:cursor-grabbing" : "opacity-90"
              } ${dragId === id ? "opacity-50" : ""}`}
            >
              <span className="w-5 text-center text-xs font-medium text-[var(--admin-muted)]">
                {index + 1}
              </span>
              {custom ? (
                <GripVertical className="h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
              ) : (
                <span className="w-4" />
              )}
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
                  {p.characterName ?? "—"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
