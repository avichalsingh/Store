"use client";

import { CollageCover } from "@/admin/components/collections/CollageCover";
import { CollageLayoutPicker } from "@/admin/components/collections/CollageLayoutPicker";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import {
  AdminField,
  AdminSelect,
} from "@/admin/components/ui/AdminField";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { MediaLibraryPickerModal } from "@/admin/components/media/MediaLibraryPickerModal";
import {
  resolveCollectionCoverUrl,
  slotCountForLayout,
} from "@/admin/lib/collectionCover";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type {
  AdminCollection,
  AdminProduct,
  CollectionAutoCoverSource,
  CollectionCollageLayout,
  CollectionCoverMode,
  CollectionCoverSlot,
} from "@/admin/types";
import { cn } from "@/lib/utils";
import { ImagePlus, Upload, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

const MODES: { id: CollectionCoverMode; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Pick from collection content" },
  { id: "single", label: "Single Video", hint: "One product thumbnail" },
  { id: "collage", label: "Collage", hint: "Multi-slot layout" },
  { id: "custom", label: "Custom Upload", hint: "Your own image" },
];

export function CollectionCoverBuilder({
  collection,
  products,
  onChange,
}: {
  collection: AdminCollection;
  products: AdminProduct[];
  onChange: (patch: Partial<AdminCollection>) => void;
}) {
  const { mediaAssets } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [slotPicker, setSlotPicker] = useState<number | null>(null);

  const inCollection = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return collection.productIds
      .map((id) => map.get(id))
      .filter((p): p is AdminProduct => !!p);
  }, [collection.productIds, products]);

  const coverUrl = resolveCollectionCoverUrl(collection, products, mediaAssets);
  const layout = collection.coverLayout ?? "four-grid";
  const slotCount = slotCountForLayout(layout);
  const slots = collection.coverSlots ?? [];
  const filled = slots.filter((s) => s.productId && s.slotIndex < slotCount).length;

  const setMode = (coverMode: CollectionCoverMode) => {
    const patch: Partial<AdminCollection> = { coverMode };
    if (coverMode === "collage" && !collection.coverLayout) {
      patch.coverLayout = "four-grid";
      patch.coverSlots = collection.productIds.slice(0, 4).map((productId, slotIndex) => ({
        slotIndex,
        productId,
      }));
    }
    if (coverMode === "auto" && !collection.coverAutoSource) {
      patch.coverAutoSource = "first";
    }
    const next = { ...collection, ...patch };
    patch.coverImage = resolveCollectionCoverUrl(
      next as AdminCollection,
      products,
      mediaAssets,
    );
    onChange(patch);
  };

  const assignSlot = (slotIndex: number, productId: string | undefined) => {
    const nextSlots: CollectionCoverSlot[] = Array.from(
      { length: slotCount },
      (_, i) => {
        const existing = slots.find((s) => s.slotIndex === i);
        if (i === slotIndex) return { slotIndex: i, productId };
        return existing ?? { slotIndex: i };
      },
    );
    const patch = { coverSlots: nextSlots };
    const next = { ...collection, ...patch, coverMode: "collage" as const };
    onChange({
      ...patch,
      coverImage: resolveCollectionCoverUrl(next, products, mediaAssets),
    });
    setSlotPicker(null);
  };

  const setLayout = (coverLayout: CollectionCollageLayout) => {
    const count = slotCountForLayout(coverLayout);
    const nextSlots = Array.from({ length: count }, (_, i) => {
      const existing = slots.find((s) => s.slotIndex === i);
      if (existing?.productId) return existing;
      const fallbackId = collection.productIds[i];
      return { slotIndex: i, productId: fallbackId };
    });
    const patch = { coverLayout, coverSlots: nextSlots };
    const next = { ...collection, ...patch, coverMode: "collage" as const };
    onChange({
      ...patch,
      coverImage: resolveCollectionCoverUrl(next, products, mediaAssets),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-4">
        {MODES.map((m) => {
          const active = collection.coverMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                active
                  ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]"
                  : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40",
              )}
            >
              <p className="text-sm font-medium text-[var(--admin-text)]">{m.label}</p>
              <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">{m.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)]">
        {collection.coverMode === "collage" ? (
          <CollageCover
            layout={layout}
            slots={slots}
            products={products}
            mediaAssets={mediaAssets}
            rounded={false}
            className="absolute inset-0 rounded-none"
          />
        ) : !inCollection.length && collection.coverMode !== "custom" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-[var(--admin-text)]">
              Add content first
            </p>
            <p className="text-xs text-[var(--admin-muted)]">
              Add products to create an automatic or collage cover — or switch to
              Custom Upload.
            </p>
          </div>
        ) : coverUrl.startsWith("blob:") || coverUrl.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Image src={coverUrl} alt="" fill className="object-cover" sizes="400px" />
        )}
      </div>

      {collection.coverMode === "auto" ? (
        <AdminField label="Auto source">
          <AdminSelect
            value={collection.coverAutoSource ?? "first"}
            onChange={(e) => {
              const coverAutoSource = e.target.value as CollectionAutoCoverSource;
              const next = { ...collection, coverAutoSource, coverMode: "auto" as const };
              onChange({
                coverAutoSource,
                coverImage: resolveCollectionCoverUrl(next, products, mediaAssets),
              });
            }}
          >
            <option value="first">First product</option>
            <option value="popular">Most popular</option>
            <option value="random">Random</option>
          </AdminSelect>
        </AdminField>
      ) : null}

      {collection.coverMode === "single" ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--admin-muted)]">
            Choose a product in this collection
          </p>
          <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {inCollection.map((p) => {
              const on = collection.coverProductId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const next = {
                      ...collection,
                      coverProductId: p.id,
                      coverMode: "single" as const,
                    };
                    onChange({
                      coverProductId: p.id,
                      coverImage: resolveCollectionCoverUrl(next, products, mediaAssets),
                    });
                  }}
                  className={cn(
                    "relative aspect-[3/4] overflow-hidden rounded-lg border-2",
                    on
                      ? "border-[var(--admin-accent)]"
                      : "border-transparent hover:border-[var(--admin-border)]",
                  )}
                >
                  <AdminThumb
                    src={resolveProductThumbnail(p, mediaAssets)}
                    alt=""
                    sizes="80px"
                    rounded="rounded-none"
                  />
                </button>
              );
            })}
          </div>
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => setMediaOpen(true)}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Choose from Media Library
          </AdminButton>
        </div>
      ) : null}

      {collection.coverMode === "collage" ? (
        <div className="space-y-4">
          <CollageLayoutPicker value={layout} onChange={setLayout} />
          <p className="text-xs text-[var(--admin-muted)]">
            {filled} of {slotCount} slots filled
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: slotCount }, (_, i) => {
              const slot = slots.find((s) => s.slotIndex === i);
              const product = products.find((p) => p.id === slot?.productId);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlotPicker(i)}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--admin-border)] px-3 py-2.5 text-left hover:border-[var(--admin-accent)]/50"
                >
                  <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                    {product ? (
                      <AdminThumb
                        src={resolveProductThumbnail(product, mediaAssets)}
                        alt=""
                        sizes="36px"
                        rounded="rounded-none"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-[var(--admin-muted)]">
                        +
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--admin-text)]">
                      Slot {i + 1}
                    </p>
                    <p className="truncate text-[11px] text-[var(--admin-muted)]">
                      {product?.name ?? "Choose video"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {collection.coverMode === "custom" ? (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              onChange({
                coverCustomUrl: url,
                coverImage: url,
                coverMode: "custom",
              });
            }}
          />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (!file || !file.type.startsWith("image/")) return;
              const url = URL.createObjectURL(file);
              onChange({
                coverCustomUrl: url,
                coverImage: url,
                coverMode: "custom",
              });
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--admin-border)] px-4 py-8 text-center"
          >
            <Upload className="h-5 w-5 text-[var(--admin-muted)]" />
            <p className="text-sm font-medium text-[var(--admin-text)]">
              Drop cover image here
            </p>
            <p className="text-xs text-[var(--admin-muted)]">or</p>
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              Upload Image
            </AdminButton>
          </div>
          {collection.coverCustomUrl || collection.coverImage ? (
            <div className="flex items-center gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                Replace
              </AdminButton>
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({
                    coverCustomUrl: undefined,
                    coverImage: "/media/collections/viral-moves-vol-01.jpg",
                  })
                }
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </AdminButton>
            </div>
          ) : null}
        </div>
      ) : null}

      <MediaLibraryPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(assetId) => {
          const asset = mediaAssets.find((a) => a.id === assetId);
          const url = asset?.thumbnail?.url;
          if (!url) return;
          // Prefer a product that uses this asset if in collection
          const linked = inCollection.find((p) => p.mediaAssetId === assetId);
          onChange({
            coverMediaId: assetId,
            coverProductId: linked?.id,
            coverImage: url,
            coverMode: "single",
          });
        }}
      />

      <AdminModal
        open={slotPicker !== null}
        onClose={() => setSlotPicker(null)}
        title={`Choose video for slot ${(slotPicker ?? 0) + 1}`}
        wide
      >
        <div className="grid max-h-80 grid-cols-3 gap-2 sm:grid-cols-4">
          {inCollection.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (slotPicker !== null) assignSlot(slotPicker, p.id);
              }}
              className="overflow-hidden rounded-lg border border-[var(--admin-border)] text-left hover:border-[var(--admin-accent)]"
            >
              <div className="relative aspect-[3/4] bg-[var(--admin-surface-2)]">
                <AdminThumb
                  src={resolveProductThumbnail(p, mediaAssets)}
                  alt=""
                  sizes="100px"
                  rounded="rounded-none"
                />
              </div>
              <p className="truncate px-2 py-1.5 text-[11px]">{p.name}</p>
            </button>
          ))}
        </div>
        {!inCollection.length ? (
          <p className="text-sm text-[var(--admin-muted)]">
            Add products to the collection first.
          </p>
        ) : null}
      </AdminModal>
    </div>
  );
}
