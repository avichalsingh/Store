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
  bundleSlotCountForLayout,
  normalizeBundleCoverData,
  resolveBundleCoverUrl,
} from "@/admin/lib/bundleCover";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import type {
  BundleAutoCoverSource,
  BundleCollageLayout,
  BundleCoverMode,
  BundleCoverSlot,
  BundleData,
} from "@/catalog/productPayloads";
import type {
  CollectionCollageLayout,
  CollectionCoverSlot,
} from "@/admin/types";
import { cn } from "@/lib/utils";
import { ImagePlus, Upload, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

const MODES: { id: BundleCoverMode; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Pick from bundle contents" },
  { id: "single", label: "Single Product", hint: "One product thumbnail" },
  { id: "collage", label: "Collage", hint: "Multi-slot layout" },
  { id: "custom", label: "Custom Upload", hint: "Your own image" },
];

export function BundleCoverBuilder({
  draft,
  includedProductIds,
  products,
  onChange,
}: {
  draft: AdminProduct;
  includedProductIds: string[];
  products: AdminProduct[];
  onChange: (bundlePatch: Partial<BundleData>) => void;
}) {
  const { mediaAssets } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [slotPicker, setSlotPicker] = useState<number | null>(null);

  const bundle = normalizeBundleCoverData(draft.bundleData);

  const inBundle = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return includedProductIds
      .map((id) => map.get(id))
      .filter((p): p is AdminProduct => !!p);
  }, [includedProductIds, products]);

  const coverUrl = resolveBundleCoverUrl(draft, products, mediaAssets);
  const layout = (bundle.coverLayout ?? "four-grid") as BundleCollageLayout;
  const slotCount = bundleSlotCountForLayout(layout);
  const slots = bundle.coverSlots ?? [];
  const filled = slots.filter(
    (s) => s.productId && s.slotIndex < slotCount,
  ).length;

  const emit = (bundlePatch: Partial<BundleData>) => onChange(bundlePatch);

  const setMode = (coverMode: BundleCoverMode) => {
    const patch: Partial<BundleData> = { coverMode };
    if (coverMode === "collage" && !bundle.coverLayout) {
      patch.coverLayout = "four-grid";
      patch.coverSlots = includedProductIds.slice(0, 4).map((productId, slotIndex) => ({
        slotIndex,
        productId,
      }));
    }
    if (coverMode === "auto" && !bundle.coverAutoSource) {
      patch.coverAutoSource = "first";
    }
    emit(patch);
  };

  const assignSlot = (slotIndex: number, productId: string | undefined) => {
    const nextSlots: BundleCoverSlot[] = Array.from(
      { length: slotCount },
      (_, i) => {
        const existing = slots.find((s) => s.slotIndex === i);
        if (i === slotIndex) return { slotIndex: i, productId };
        return existing ?? { slotIndex: i };
      },
    );
    emit({ coverSlots: nextSlots, coverMode: "collage" });
    setSlotPicker(null);
  };

  const setLayout = (coverLayout: BundleCollageLayout) => {
    const count = bundleSlotCountForLayout(coverLayout);
    const nextSlots = Array.from({ length: count }, (_, i) => {
      const existing = slots.find((s) => s.slotIndex === i);
      if (existing?.productId) return existing;
      const fallbackId = includedProductIds[i];
      return { slotIndex: i, productId: fallbackId };
    });
    emit({ coverLayout, coverSlots: nextSlots, coverMode: "collage" });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-4">
        {MODES.map((m) => {
          const active = bundle.coverMode === m.id;
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
        {bundle.coverMode === "collage" ? (
          <CollageCover
            layout={layout as CollectionCollageLayout}
            slots={slots as CollectionCoverSlot[]}
            products={products}
            mediaAssets={mediaAssets}
            rounded={false}
            className="absolute inset-0 rounded-none"
          />
        ) : !inBundle.length && bundle.coverMode !== "custom" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-[var(--admin-text)]">
              Add products first
            </p>
            <p className="text-xs text-[var(--admin-muted)]">
              Add products to the bundle to create an automatic or collage cover —
              or switch to Custom Upload.
            </p>
          </div>
        ) : coverUrl && (coverUrl.startsWith("blob:") || coverUrl.startsWith("data:")) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : coverUrl ? (
          <Image src={coverUrl} alt="" fill className="object-cover" sizes="400px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--admin-muted)]">
            No cover preview
          </div>
        )}
      </div>

      {bundle.coverMode === "auto" ? (
        <AdminField label="Auto source">
          <AdminSelect
            value={bundle.coverAutoSource ?? "first"}
            onChange={(e) => {
              emit({
                coverAutoSource: e.target.value as BundleAutoCoverSource,
                coverMode: "auto",
              });
            }}
          >
            <option value="first">First product</option>
            <option value="popular">Most popular</option>
            <option value="random">Random</option>
          </AdminSelect>
        </AdminField>
      ) : null}

      {bundle.coverMode === "single" ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--admin-muted)]">
            Choose a product in this bundle
          </p>
          <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {inBundle.map((p) => {
              const on = bundle.coverProductId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    emit({
                      coverProductId: p.id,
                      coverMode: "single",
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

      {bundle.coverMode === "collage" ? (
        <div className="space-y-4">
          <CollageLayoutPicker
            value={layout as CollectionCollageLayout}
            onChange={(l) => setLayout(l as BundleCollageLayout)}
          />
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
                      {product?.name ?? "Choose product"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {bundle.coverMode === "custom" ? (
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
              emit({
                coverCustomUrl: url,
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
              emit({
                coverCustomUrl: url,
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
          {bundle.coverCustomUrl ? (
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
                  emit({
                    coverCustomUrl: undefined,
                    coverMode: "auto",
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
          const linked = inBundle.find((p) => p.mediaAssetId === assetId);
          emit({
            coverMediaId: assetId,
            coverProductId: linked?.id,
            coverMode: "single",
          });
        }}
      />

      <AdminModal
        open={slotPicker !== null}
        onClose={() => setSlotPicker(null)}
        title={`Choose product for slot ${(slotPicker ?? 0) + 1}`}
        wide
      >
        <div className="grid max-h-80 grid-cols-3 gap-2 sm:grid-cols-4">
          {inBundle.map((p) => (
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
        {!inBundle.length ? (
          <p className="text-sm text-[var(--admin-muted)]">
            Add products to the bundle first.
          </p>
        ) : null}
      </AdminModal>
    </div>
  );
}
