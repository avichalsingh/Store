"use client";

import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminCharacter, AdminProduct } from "@/admin/types";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function CollectionContentGrid({
  productIds,
  products,
  characters,
  onReorder,
  onRemove,
  disabled,
  onAddContent,
}: {
  productIds: string[];
  products: AdminProduct[];
  characters: AdminCharacter[];
  onReorder: (next: string[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  onAddContent?: () => void;
}) {
  const { mediaAssets } = useAdmin();
  const [dragId, setDragId] = useState<string | null>(null);
  const map = new Map(products.map((p) => [p.id, p]));
  const charMap = new Map(characters.map((c) => [c.id, c]));

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
          No content added yet
        </p>
        <p className="max-w-sm text-xs text-[var(--admin-muted)]">
          Add products, videos or entire character catalogs to start building this
          collection.
        </p>
        {onAddContent ? (
          <AdminButton variant="primary" size="sm" onClick={onAddContent}>
            <Plus className="h-3.5 w-3.5" />
            Add Content
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
        const character = charMap.get(p.characterId ?? "");
        return (
          <div
            key={id}
            draggable={!disabled}
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) move(dragId, id);
              setDragId(null);
            }}
            onDragEnd={() => setDragId(null)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-sm)] transition duration-200",
              dragId === id && "opacity-60",
              !disabled && "cursor-grab hover:-translate-y-0.5 hover:shadow-[var(--admin-shadow-md)] active:cursor-grabbing",
            )}
          >
            <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
              <span className="rounded-lg bg-black/45 p-1 text-white backdrop-blur-sm">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            </div>
            {!disabled ? (
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onRemove(id)}
                className="absolute right-2 top-2 z-10 rounded-lg bg-black/45 p-1 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-[var(--admin-danger)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
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
              <div className="flex items-center gap-1.5">
                {character?.image ? (
                  <span className="relative h-5 w-5 overflow-hidden rounded-full">
                    <Image
                      src={character.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="20px"
                    />
                  </span>
                ) : null}
                <span className="truncate text-xs text-[var(--admin-muted)]">
                  {p.characterName ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-xs font-medium text-[var(--admin-text)]">
                  {formatInr(p.pricing.INR.currentPrice)}
                </span>
                <StatusBadge status={p.status} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
