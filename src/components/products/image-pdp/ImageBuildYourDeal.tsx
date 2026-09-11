"use client";

import { useState, type ReactNode } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatPrice } from "@/lib/pricing";
import {
  dealMotivationMessage,
  formatPerImage,
  getDealQuote,
  nextTierUpsellStrip,
} from "@/lib/imageDealPricing";
import type { ImagePdpPricingTier } from "@/catalog/imagePdpTypes";
import type { Region } from "@/types";
import { FullCollectionModal } from "@/components/products/image-pdp/FullCollectionModal";
import {
  LibraryImagePickerModal,
  type LibraryItem,
} from "@/components/products/image-pdp/LibraryImagePickerModal";
import { cn } from "@/lib/utils";

export type DealPath = "custom" | "collection";

export function ImageBuildYourDeal({
  dealPath,
  onDealPathChange,
  selectedIds,
  onSelectedChange,
  currentProductId,
  productTitle,
  library,
  collection,
  singleSale,
  singleRegular,
  region,
  ready,
  onPurchase,
  onBrowseCollection,
  pricingTiers,
  enableAddMoreImages = true,
}: {
  dealPath: DealPath | null;
  onDealPathChange: (path: DealPath | null) => void;
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  currentProductId: string;
  productTitle: string;
  library: LibraryItem[];
  collection?: {
    title: string;
    imageCount: number;
    previewImages: string[];
    comparePrice: number;
    salePrice: number;
    saveAmount: number;
    badge?: string;
  };
  singleSale: number;
  singleRegular: number;
  region: Region;
  ready: boolean;
  onPurchase: (path: DealPath | null) => void;
  onBrowseCollection?: () => void;
  pricingTiers?: ImagePdpPricingTier[];
  enableAddMoreImages?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);

  const count = selectedIds.length;
  const customQuote = getDealQuote(count, singleSale, region, pricingTiers);
  const upsellStrip = nextTierUpsellStrip(count, region, singleSale, pricingTiers);
  const motivation = dealMotivationMessage(count, region, singleSale, pricingTiers);

  const previews = collection?.previewImages.slice(0, 3) ?? [];
  const moreCount = collection
    ? Math.max(0, collection.imageCount - previews.length)
    : 0;

  const collectionBadge = collection?.badge ?? "BEST VALUE";

  const summary =
    dealPath === "collection" && collection
      ? {
          dealLabel: "🔥 FULL COLLECTION DEAL",
          selectedLabel: "✓ Full collection selected",
          title: collection.title,
          countLabel: `${collection.imageCount} IMAGES`,
          compare: collection.comparePrice,
          total: collection.salePrice,
          save: collection.saveAmount,
          perImage: null as number | null,
          showBestValue: true,
          badge: collectionBadge,
          nextDrop: null as string | null,
          cta: `⚡ GET ALL ${collection.imageCount} IMAGES — ${ready ? formatPrice(collection.salePrice, region) : "—"}`,
        }
      : dealPath === "custom"
        ? {
            dealLabel: "🔥 YOUR CUSTOM BUNDLE",
            selectedLabel:
              count > 1 ? `✓ ${count} images selected` : "✓ Add more images selected",
            title: count > 1 ? `${count} IMAGES SELECTED` : productTitle,
            countLabel:
              count > 1
                ? `${formatPerImage(customQuote.perImage, region)} PER IMAGE`
                : "1 IMAGE",
            compare: customQuote.compare,
            total: customQuote.total,
            save: customQuote.save,
            perImage: customQuote.perImage,
            showBestValue: false,
            badge: null as string | null,
            nextDrop: customQuote.tierLabel,
            cta:
              count > 1
                ? `⚡ GET MY ${count} IMAGES — ${ready ? formatPrice(customQuote.total, region) : "—"}`
                : `⚡ GET MY DEAL — ${ready ? formatPrice(singleSale, region) : "—"}`,
          }
        : {
            dealLabel: undefined,
            selectedLabel: undefined,
            title: productTitle,
            countLabel: "1 IMAGE",
            compare: singleRegular,
            total: singleSale,
            save: Math.max(0, singleRegular - singleSale),
            perImage: singleSale,
            showBestValue: false,
            badge: null as string | null,
            nextDrop: null as string | null,
            cta: `⚡ GET MY DEAL — ${ready ? formatPrice(singleSale, region) : "—"}`,
          };

  return (
    <>
      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            🔥 BUILD YOUR DEAL
          </p>
          <p className="mt-1 text-sm font-medium text-muted">
            More images. Bigger savings. Your choice.
          </p>
        </div>

        <div className="space-y-2.5">
          {collection ? (
            <DealOption
              active={dealPath === "collection"}
              onSelect={() => onDealPathChange("collection")}
              title="Get the full collection"
              subtitle={`Get all ${collection.imageCount} images from the “${collection.title}” collection.`}
              badge={collectionBadge}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text">
                {collection.imageCount} images in this collection
              </p>

              <div className="mt-2 flex items-center gap-1.5">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="relative h-12 w-12 overflow-hidden rounded-lg ring-1 ring-border"
                  >
                    <CoverImage
                      src={src}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ))}
                {moreCount > 0 ? (
                  <span className="flex h-12 min-w-[3rem] items-center justify-center rounded-lg bg-surface-2 text-[11px] font-bold text-muted ring-1 ring-border">
                    +{moreCount}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/[0.05] to-surface">
                <div className="flex items-center justify-between gap-3 border-b border-border/80 px-3 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    {ready ? formatPrice(singleSale, region) : "—"} for 1 image
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
                      Get all {collection.imageCount}
                    </p>
                    <p className="text-[10px] text-muted">Full collection</p>
                  </div>
                  <span className="font-display text-2xl font-bold tabular-nums text-text">
                    {ready ? formatPrice(collection.salePrice, region) : "—"}
                  </span>
                </div>
                <div className="border-t border-border/80 px-3 py-2 text-xs text-muted">
                  {ready ? formatPrice(singleSale, region) : "—"} ×{" "}
                  {collection.imageCount} ={" "}
                  <span className="font-semibold line-through tabular-nums">
                    {ready ? formatPrice(collection.comparePrice, region) : "—"}
                  </span>
                </div>
                {collection.saveAmount > 0 ? (
                  <div className="border-t border-accent/20 bg-accent/[0.08] px-3 py-2">
                    <p className="text-sm font-bold uppercase tracking-wide text-accent">
                      🔥 You save{" "}
                      {ready ? formatPrice(collection.saveAmount, region) : "—"}
                    </p>
                  </div>
                ) : null}
              </div>

              <p className="mt-2 text-[11px] font-medium leading-snug text-muted">
                Why buy one by one when you can unlock everything for less?
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDealPathChange("collection");
                  setCollectionOpen(true);
                }}
                className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-accent hover:underline"
              >
                View all {collection.imageCount} images →
              </button>
            </DealOption>
          ) : null}

          {enableAddMoreImages ? (
          <DealOption
            active={dealPath === "custom"}
            onSelect={() => onDealPathChange("custom")}
            title="Add more images & save more"
            subtitle="Pick any images from the entire RHYTHM library. The more you add, the lower your price per image."
          >
            {dealPath === "custom" ? (
              <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Current deal
                </p>
                <p className="mt-1 text-sm font-bold text-text">
                  {count} image{count === 1 ? "" : "s"} selected
                </p>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums text-text">
                  {formatPerImage(customQuote.perImage, region)}
                  <span className="ml-1 text-sm font-semibold text-muted">
                    / image
                  </span>
                </p>
                {customQuote.save > 0 ? (
                  <>
                    <p className="mt-1 text-xs text-muted">
                      Instead of{" "}
                      <span className="font-semibold line-through tabular-nums">
                        {ready ? formatPrice(customQuote.compare, region) : "—"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm font-bold text-accent">
                      🔥 You save{" "}
                      {ready ? formatPrice(customQuote.save, region) : "—"}
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}

            {dealPath === "custom" && motivation ? (
              <p className="mt-2 text-xs font-medium leading-snug text-accent">
                {motivation}
              </p>
            ) : null}

            {dealPath === "custom" && upsellStrip ? (
              <p className="mt-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
                🔥 {upsellStrip}
              </p>
            ) : null}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDealPathChange("custom");
                setPickerOpen(true);
              }}
              className="mt-3 inline-flex rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-accent transition hover:bg-accent hover:text-white"
            >
              + Add more images
            </button>
          </DealOption>
          ) : null}
        </div>

        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.06] to-surface px-4 py-4 shadow-[0_8px_32px_rgba(255,92,138,0.08)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Your deal
          </p>
          {summary.dealLabel ? (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
              {summary.dealLabel}
            </p>
          ) : null}
          {summary.selectedLabel && dealPath ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {summary.selectedLabel}
            </p>
          ) : null}
          <p className="mt-1 font-semibold text-text">{summary.title}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-text-dim">
            {summary.countLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            {summary.save > 0 && summary.compare > summary.total ? (
              <span className="text-lg text-muted line-through tabular-nums">
                {ready ? formatPrice(summary.compare, region) : "—"}
              </span>
            ) : null}
            <span className="font-display text-3xl font-bold tabular-nums text-text">
              {ready ? formatPrice(summary.total, region) : "—"}
            </span>
          </div>
          {summary.showBestValue && summary.badge ? (
            <span className="mt-2 inline-flex rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
              {summary.badge.includes("🔥") ? summary.badge : `🔥 ${summary.badge}`}
            </span>
          ) : null}
          {summary.save > 0 ? (
            <p className="mt-2 text-sm font-bold uppercase tracking-wide text-accent">
              🔥 You save {ready ? formatPrice(summary.save, region) : "—"}
            </p>
          ) : null}
          {summary.perImage && dealPath === "custom" && count > 1 ? (
            <p className="mt-1 text-sm font-bold text-accent">
              🔥 {formatPerImage(summary.perImage, region)} per image
            </p>
          ) : null}
          {summary.nextDrop && dealPath === "custom" ? (
            <p className="mt-2 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
              Next price drop · {summary.nextDrop}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => onPurchase(dealPath)}
            className="cta-heartbeat mt-4 w-full rounded-full bg-accent py-3.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            {summary.cta}
          </button>
        </div>
      </section>

      <LibraryImagePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentProductId={currentProductId}
        library={library}
        selectedIds={selectedIds}
        onSelectedChange={onSelectedChange}
        region={region}
        ready={ready}
        onConfirm={() => onDealPathChange("custom")}
        pricingTiers={pricingTiers}
      />

      {collection ? (
        <FullCollectionModal
          open={collectionOpen}
          onClose={() => setCollectionOpen(false)}
          title={collection.title}
          images={collection.previewImages}
          imageCount={collection.imageCount}
          comparePrice={collection.comparePrice}
          salePrice={collection.salePrice}
          saveAmount={collection.saveAmount}
          region={region}
          ready={ready}
          onPurchase={() => onPurchase("collection")}
        />
      ) : null}
    </>
  );
}

function DealOption({
  active,
  onSelect,
  title,
  subtitle,
  badge,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition",
        active
          ? "border-accent/60 bg-accent/[0.08] shadow-[0_8px_32px_rgba(255,92,138,0.14)] ring-1 ring-accent/20"
          : "border-border bg-surface hover:border-accent/30",
      )}
    >
      <div className="flex gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
            active ? "border-accent bg-accent/10" : "border-border",
          )}
          aria-hidden
        >
          {active ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-text">
              {title}
            </p>
            {badge ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                {badge.startsWith("🔥") ? badge : `🔥 ${badge}`}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</p>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </button>
  );
}
