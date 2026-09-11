"use client";

import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import type {
  AdminProduct,
  CollectionCollageLayout,
  CollectionCoverSlot,
  MediaAsset,
} from "@/admin/types";
import { slotCountForLayout } from "@/admin/lib/collectionCover";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { cn } from "@/lib/utils";

const LAYOUT_GRID: Record<CollectionCollageLayout, { className: string }> = {
  single: { className: "grid-cols-1 grid-rows-1" },
  "two-horizontal": { className: "grid-cols-2 grid-rows-1" },
  "two-vertical": { className: "grid-cols-1 grid-rows-2" },
  "three-horizontal": { className: "grid-cols-3 grid-rows-1" },
  "three-vertical": { className: "grid-cols-1 grid-rows-3" },
  "three-large-left": { className: "grid-cols-2 grid-rows-2" },
  "three-large-right": { className: "grid-cols-2 grid-rows-2" },
  "four-grid": { className: "grid-cols-2 grid-rows-2" },
  "four-horizontal": { className: "grid-cols-4 grid-rows-1" },
  "four-vertical": { className: "grid-cols-1 grid-rows-4" },
};

function slotProduct(
  slots: CollectionCoverSlot[] | undefined,
  index: number,
  products: AdminProduct[],
): AdminProduct | undefined {
  const slot = slots?.find((s) => s.slotIndex === index);
  if (!slot?.productId) return undefined;
  return products.find((p) => p.id === slot.productId);
}

export function CollageCover({
  layout = "four-grid",
  slots = [],
  products,
  mediaAssets = [],
  className,
  rounded = true,
}: {
  layout?: CollectionCollageLayout;
  slots?: CollectionCoverSlot[];
  products: AdminProduct[];
  mediaAssets?: MediaAsset[];
  className?: string;
  rounded?: boolean;
}) {
  const count = slotCountForLayout(layout);
  const cfg = LAYOUT_GRID[layout] ?? LAYOUT_GRID["four-grid"];

  // Special asymmetric layouts
  if (layout === "three-large-left") {
    const a = slotProduct(slots, 0, products);
    const b = slotProduct(slots, 1, products);
    const c = slotProduct(slots, 2, products);
    return (
      <div
        className={cn(
          "grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-[var(--admin-surface-2)]",
          rounded && "rounded-xl",
          className,
        )}
      >
        <SlotCell product={a} mediaAssets={mediaAssets} className="row-span-2" />
        <SlotCell product={b} mediaAssets={mediaAssets} />
        <SlotCell product={c} mediaAssets={mediaAssets} />
      </div>
    );
  }

  if (layout === "three-large-right") {
    const a = slotProduct(slots, 0, products);
    const b = slotProduct(slots, 1, products);
    const c = slotProduct(slots, 2, products);
    return (
      <div
        className={cn(
          "grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-[var(--admin-surface-2)]",
          rounded && "rounded-xl",
          className,
        )}
      >
        <SlotCell product={a} mediaAssets={mediaAssets} />
        <SlotCell product={b} mediaAssets={mediaAssets} className="row-span-2" />
        <SlotCell product={c} mediaAssets={mediaAssets} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid h-full w-full gap-0.5 overflow-hidden bg-[var(--admin-surface-2)]",
        cfg.className,
        rounded && "rounded-xl",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <SlotCell
          key={i}
          product={slotProduct(slots, i, products)}
          mediaAssets={mediaAssets}
        />
      ))}
    </div>
  );
}

function SlotCell({
  product,
  mediaAssets,
  className,
}: {
  product?: AdminProduct;
  mediaAssets?: MediaAsset[];
  className?: string;
}) {
  const thumb = resolveProductThumbnail(product, mediaAssets);
  return (
    <div className={cn("relative min-h-0 bg-[var(--admin-border)]", className)}>
      {thumb ? (
        <AdminThumb src={thumb} alt="" sizes="120px" rounded="rounded-none" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-[var(--admin-muted)]">
          Empty
        </div>
      )}
    </div>
  );
}

/** Mini visual for layout picker cards */
export function CollageLayoutPreview({
  layout,
  active,
}: {
  layout: CollectionCollageLayout;
  active?: boolean;
}) {
  const count = slotCountForLayout(layout);
  const cells = Array.from({ length: count }, (_, i) => i);

  let gridClass = "grid-cols-2 grid-rows-2";
  if (layout === "single") gridClass = "grid-cols-1 grid-rows-1";
  else if (layout === "two-horizontal") gridClass = "grid-cols-2 grid-rows-1";
  else if (layout === "two-vertical") gridClass = "grid-cols-1 grid-rows-2";
  else if (layout === "three-horizontal") gridClass = "grid-cols-3 grid-rows-1";
  else if (layout === "three-vertical") gridClass = "grid-cols-1 grid-rows-3";
  else if (layout === "four-horizontal") gridClass = "grid-cols-4 grid-rows-1";
  else if (layout === "four-vertical") gridClass = "grid-cols-1 grid-rows-4";

  if (layout === "three-large-left") {
    return (
      <div
        className={cn(
          "grid h-14 w-full grid-cols-2 grid-rows-2 gap-0.5 rounded-md p-1",
          active ? "bg-[var(--admin-accent-soft)]" : "bg-[var(--admin-surface-2)]",
        )}
      >
        <div className="row-span-2 rounded-sm bg-[var(--admin-muted)]/40" />
        <div className="rounded-sm bg-[var(--admin-muted)]/30" />
        <div className="rounded-sm bg-[var(--admin-muted)]/30" />
      </div>
    );
  }
  if (layout === "three-large-right") {
    return (
      <div
        className={cn(
          "grid h-14 w-full grid-cols-2 grid-rows-2 gap-0.5 rounded-md p-1",
          active ? "bg-[var(--admin-accent-soft)]" : "bg-[var(--admin-surface-2)]",
        )}
      >
        <div className="rounded-sm bg-[var(--admin-muted)]/30" />
        <div className="row-span-2 rounded-sm bg-[var(--admin-muted)]/40" />
        <div className="rounded-sm bg-[var(--admin-muted)]/30" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid h-14 w-full gap-0.5 rounded-md p-1",
        gridClass,
        active ? "bg-[var(--admin-accent-soft)]" : "bg-[var(--admin-surface-2)]",
      )}
    >
      {cells.map((i) => (
        <div key={i} className="rounded-sm bg-[var(--admin-muted)]/35" />
      ))}
    </div>
  );
}
