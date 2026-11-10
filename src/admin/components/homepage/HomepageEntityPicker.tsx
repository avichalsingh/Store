"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { MediaPreviewPlayer } from "@/admin/components/media/MediaPreviewPlayer";
import {
  appendUniqueIds,
  removeSelectedId,
  reorderSelectedId,
  setSingleSelectedId,
} from "@/admin/lib/homepageEntitySelection";
import {
  resolveCollectionThumbnail,
  resolveProductThumbnail,
} from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminCollection, AdminProduct, MediaAsset } from "@/admin/types";
import {
  getProductTypeConfig,
  type ProductType,
} from "@/catalog/productTypes";
import {
  isStorefrontCatalogProductId,
  mapStorefrontCatalogPickProducts,
  storefrontProductIdSet,
  type StorefrontCatalogIdSet,
  type StorefrontCatalogPickProduct,
} from "@/catalog/storefrontCatalogPresence";
import { cn } from "@/lib/utils";
import { Film, GripVertical, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type HomepagePickerKind = "product" | "collection";

type Props = {
  kind: HomepagePickerKind;
  selectedIds: string[];
  onChange: (next: string[]) => void;
  /** Restrict product candidates (products only). */
  productTypeHint?: ProductType | "ANY";
  /** multi (default) or single (hero featured / ticker product link). */
  selectionMode?: "multi" | "single";
  emptyHint?: string;
  addLabel?: string;
  className?: string;
};


/**
 * Visual multi/single entity picker for Homepage CMS Stage 1.
 * Writes ordered ID arrays only — never deletes catalog entities.
 */
export function HomepageEntityPicker({
  kind,
  selectedIds,
  onChange,
  productTypeHint = "ANY",
  selectionMode = "multi",
  emptyHint = "Leave empty for storefront automatic fallbacks.",
  addLabel = "Add items",
  className,
}: Props) {
  const { products, collections, mediaAssets } = useAdmin();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  /** Live storefront catalog (null while loading / unavailable). */
  const [storefrontCatalogIds, setStorefrontCatalogIds] =
    useState<StorefrontCatalogIdSet | null>(null);
  const [storefrontPickProducts, setStorefrontPickProducts] = useState<
    StorefrontCatalogPickProduct[]
  >([]);

  useEffect(() => {
    if (kind !== "product") return;
    let cancelled = false;
    async function loadCatalogProducts() {
      try {
        const res = await fetch("/api/catalog", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setStorefrontCatalogIds(new Set());
            setStorefrontPickProducts([]);
          }
          return;
        }
        const body = (await res.json()) as {
          products?: Array<Record<string, unknown>>;
        };
        if (cancelled) return;
        const picks = mapStorefrontCatalogPickProducts(body.products);
        setStorefrontPickProducts(picks);
        setStorefrontCatalogIds(storefrontProductIdSet(picks));
      } catch {
        if (!cancelled) {
          setStorefrontCatalogIds(new Set());
          setStorefrontPickProducts([]);
        }
      }
    }
    void loadCatalogProducts();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const storefrontProductMap = useMemo(
    () => new Map(storefrontPickProducts.map((p) => [p.id, p])),
    [storefrontPickProducts],
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const collectionMap = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );

  const resolveThumb = (id: string): string => {
    if (kind === "product") {
      const adminThumb = resolveProductThumbnail(
        productMap.get(id),
        mediaAssets,
      );
      if (adminThumb) return adminThumb;
      return storefrontProductMap.get(id)?.thumbnail ?? "";
    }
    const c = collectionMap.get(id);
    return c ? resolveCollectionThumbnail(c, products, mediaAssets) : "";
  };

  const resolveTitle = (id: string): string => {
    if (kind === "product") {
      return (
        productMap.get(id)?.name ??
        storefrontProductMap.get(id)?.name ??
        id
      );
    }
    return collectionMap.get(id)?.name ?? id;
  };

  const isMissing = (id: string): boolean => {
    if (kind === "product") {
      return !productMap.has(id) && !storefrontProductMap.has(id);
    }
    return !collectionMap.has(id);
  };

  const isUnavailableOnStorefront = (id: string): boolean => {
    if (kind !== "product") return false;
    if (!storefrontCatalogIds) return false;
    return !isStorefrontCatalogProductId(id, storefrontCatalogIds);
  };

  const mediaForProduct = (id: string): MediaAsset | undefined => {
    const p = productMap.get(id);
    if (!p?.mediaAssetId) return undefined;
    return mediaAssets.find((a) => a.id === p.mediaAssetId);
  };

  const onDropReorder = (toId: string) => {
    if (!dragId || selectionMode === "single") return;
    onChange(reorderSelectedId(selectedIds, dragId, toId));
    setDragId(null);
  };

  const remove = (id: string) => {
    if (selectionMode === "single") {
      onChange([]);
      return;
    }
    onChange(removeSelectedId(selectedIds, id));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--admin-muted)]">{emptyHint}</p>
        {selectedIds.length > 0 ? (
          <p className="text-[11px] font-medium text-[var(--admin-fg)]">
            {selectedIds.length} selected
            {selectionMode === "multi" ? " · drag to reorder" : ""}
          </p>
        ) : null}
      </div>

      {selectedIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-6 text-center">
          <p className="text-xs text-[var(--admin-muted)]">
            No items selected — storefront will use automatic fallbacks.
          </p>
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {addLabel}
          </AdminButton>
        </div>
      ) : (
        <>
          {/*
            Compact auto-fill grid so every selected id is visible at once.
            Do not use a full-width single column — that stretches one tall
            portrait card across the editor and hides the multi-card intent.
          */}
          <div
            className={cn(
              "grid w-full gap-2",
              selectionMode === "single"
                ? "max-w-[9rem] grid-cols-1"
                : "[grid-template-columns:repeat(auto-fill,minmax(7.25rem,1fr))]",
            )}
            data-selected-count={selectedIds.length}
            data-selection-mode={selectionMode}
          >
            {selectedIds.map((id) => {
              const missing = isMissing(id);
              const unavailable = !missing && isUnavailableOnStorefront(id);
              const asset =
                kind === "product" && !missing ? mediaForProduct(id) : undefined;
              const canPreview =
                Boolean(asset) &&
                productMap.get(id)?.productType === "VIDEO";
              return (
                <div
                  key={id}
                  data-entity-id={id}
                  data-storefront-unavailable={unavailable ? "true" : "false"}
                  draggable={selectionMode === "multi"}
                  onDragStart={() => setDragId(id)}
                  onDragOver={(e) => {
                    if (selectionMode === "multi") e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropReorder(id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]",
                    selectionMode === "multi" && "cursor-grab active:cursor-grabbing",
                    dragId === id && "opacity-60",
                    unavailable && "border-[var(--admin-warning, #b45309)]",
                  )}
                >
                  {selectionMode === "multi" ? (
                    <span className="absolute left-1 top-1 z-10 rounded bg-black/45 p-0.5 text-white">
                      <GripVertical className="h-3 w-3" />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Remove from homepage selection"
                    onClick={() => remove(id)}
                    className="absolute right-1 top-1 z-10 rounded bg-black/55 p-0.5 text-white transition hover:bg-[var(--admin-danger)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="relative aspect-square bg-[var(--admin-surface-2)]">
                    {missing ? (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-1.5 text-center text-[10px] text-[var(--admin-muted)]">
                        <Film className="h-3.5 w-3.5 opacity-60" />
                        Missing
                      </span>
                    ) : (
                      <AdminThumb
                        src={resolveThumb(id)}
                        alt=""
                        sizes="120px"
                        rounded="rounded-none"
                      />
                    )}
                    {canPreview && asset ? (
                      <button
                        type="button"
                        className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm"
                        onClick={() => setPreviewAsset(asset)}
                      >
                        Preview
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-0.5 p-1.5">
                    <p className="line-clamp-2 text-[11px] font-semibold leading-tight">
                      {resolveTitle(id)}
                    </p>
                    {missing ? (
                      <p className="truncate text-[9px] text-[var(--admin-muted)]">
                        id: {id}
                      </p>
                    ) : unavailable ? (
                      <p className="text-[9px] leading-snug text-[var(--admin-warning,#b45309)]">
                        Not on storefront catalog — hero will auto-fallback
                      </p>
                    ) : kind === "product" ? (
                      <AdminBadge tone="neutral">
                        {
                          getProductTypeConfig(
                            productMap.get(id)?.productType ??
                              storefrontProductMap.get(id)?.productType ??
                              "VIDEO",
                          ).label
                        }
                      </AdminBadge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {selectionMode === "multi" || selectedIds.length === 0 ? (
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {addLabel}
            </AdminButton>
          ) : (
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              Change selection
            </AdminButton>
          )}
        </>
      )}

      <HomepageEntityBrowseModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind={kind}
        productTypeHint={productTypeHint}
        selectionMode={selectionMode}
        alreadySelected={selectedIds}
        products={products}
        storefrontProducts={storefrontPickProducts}
        collections={collections}
        mediaAssets={mediaAssets}
        catalogLoading={kind === "product" && storefrontCatalogIds === null}
        onConfirm={(ids) => {
          if (selectionMode === "single") {
            onChange(setSingleSelectedId(ids[0]));
          } else {
            onChange(appendUniqueIds(selectedIds, ids));
          }
          setPickerOpen(false);
        }}
      />

      <AdminModal
        open={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        title="Video preview"
        size="xl"
      >
        {previewAsset ? (
          <MediaPreviewPlayer
            asset={previewAsset}
            variant="detail"
            preferSource="preview"
            className="aspect-video w-full overflow-hidden rounded-xl"
          />
        ) : null}
      </AdminModal>
    </div>
  );
}

function HomepageEntityBrowseModal({
  open,
  onClose,
  kind,
  productTypeHint,
  selectionMode,
  alreadySelected,
  products,
  storefrontProducts,
  collections,
  mediaAssets,
  catalogLoading = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  kind: HomepagePickerKind;
  productTypeHint: ProductType | "ANY";
  selectionMode: "multi" | "single";
  alreadySelected: string[];
  products: AdminProduct[];
  storefrontProducts: StorefrontCatalogPickProduct[];
  collections: AdminCollection[];
  mediaAssets: MediaAsset[];
  catalogLoading?: boolean;
  onConfirm: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setQ("");
      setPicked(new Set());
    }
  }, [open]);

  const already = useMemo(
    () => new Set(alreadySelected),
    [alreadySelected],
  );

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (kind === "product") {
      // Browse the live storefront catalog only — seed-only admin IDs never render.
      return storefrontProducts
        .filter((p) => {
          if (selectionMode === "multi" && already.has(p.id)) return false;
          if (productTypeHint && productTypeHint !== "ANY") {
            if (p.productType !== productTypeHint) return false;
          }
          if (!query) return true;
          return (
            p.name.toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query)
          );
        })
        .map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: getProductTypeConfig(p.productType).label,
          thumb: p.thumbnail,
        }));
    }
    return collections
      .filter((c) => {
        if (selectionMode === "multi" && already.has(c.id)) return false;
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
        );
      })
      .map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.status,
        thumb: resolveCollectionThumbnail(c, products, mediaAssets),
      }));
  }, [
    kind,
    products,
    storefrontProducts,
    collections,
    mediaAssets,
    already,
    productTypeHint,
    selectionMode,
    q,
  ]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (selectionMode === "single") return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={kind === "product" ? "Choose products" : "Choose collections"}
      size="xl"
      footer={
        <>
          <p className="mr-auto text-sm text-[var(--admin-muted)]">
            {picked.size} selected
          </p>
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            disabled={!picked.size}
            onClick={() => onConfirm([...picked])}
          >
            {selectionMode === "single" ? "Use selection" : "Add selected"}
          </AdminButton>
        </>
      }
    >
      <div className="space-y-3">
        <AdminSearchInput
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="max-h-[min(52vh,480px)] space-y-1 overflow-y-auto rounded-xl border border-[var(--admin-border)]">
          {catalogLoading ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
              Loading storefront catalog…
            </p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
              {kind === "product"
                ? "No storefront catalog products match. Publish products to the catalog first, or clear this slot for automatic fallback."
                : "No matching items."}
            </p>
          ) : (
            rows.map((row) => {
              const on = picked.has(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => toggle(row.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                    on
                      ? "bg-[var(--admin-accent-soft)]"
                      : "hover:bg-[var(--admin-surface-2)]",
                  )}
                >
                  <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                    <AdminThumb src={row.thumb} alt="" sizes="36px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.title}</p>
                    <p className="truncate text-xs text-[var(--admin-muted)]">
                      {row.subtitle}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </AdminModal>
  );
}
