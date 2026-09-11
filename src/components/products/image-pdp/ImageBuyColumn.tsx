"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { AiImageProductPublic, CatalogProduct } from "@/types";
import { useCatalog } from "@/catalog/useCatalog";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { formatPrice, getCatalogProductQuote } from "@/lib/pricing";
import { getCollectionBundleQuote } from "@/lib/imageCollectionPricing";
import {
  customDealPrice,
  distributeLinePrices,
} from "@/lib/imageDealPricing";
import { CoverImage } from "@/components/ui/CoverImage";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";
import { CreatePossibilitiesBento } from "@/components/products/image-pdp/CreatePossibilitiesBento";
import {
  ImageBuildYourDeal,
  type DealPath,
} from "@/components/products/image-pdp/ImageBuildYourDeal";
import { buildLibraryItems } from "@/components/products/image-pdp/LibraryImagePickerModal";
import { PromoCountdownBlocks } from "@/components/products/image-pdp/PromoCountdownBlocks";
import { useIntroPriceTimer } from "@/hooks/useIntroPriceTimer";
import { cn } from "@/lib/utils";

function formatRes(value?: string) {
  if (!value?.trim()) return "2048 × 2048";
  return value.replace(/[xX×]/g, " × ").replace(/\s+/g, " ").trim();
}

function MetaChip({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        accent
          ? "border-accent/35 bg-accent/10 text-accent"
          : "border-border bg-surface-2 text-text-dim",
      )}
    >
      {children}
    </span>
  );
}

export function ImageBuyColumn({
  product,
  dealPath,
  onDealPathChange,
  selectedIds,
  onSelectedIdsChange,
  onBrowseCollection,
}: {
  product: AiImageProductPublic;
  dealPath: DealPath | null;
  onDealPathChange: (path: DealPath | null) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onBrowseCollection?: () => void;
}) {
  const catalog = useCatalog();
  const { region, ready } = useRegion();
  const { addProduct, items } = useCart();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();

  const pack = product.packUpgrade;
  const packProduct = pack
    ? (catalog.getProductById(pack.productId) as AiImageProductPublic | undefined)
    : undefined;
  const packQuote = packProduct
    ? getCatalogProductQuote(packProduct, region)
    : null;

  const pricedSale =
    product.pricing?.[region]?.salePrice ??
    product.pricing?.[region]?.regularPrice ??
    product.price;
  const pricedRegular =
    product.pricing?.[region]?.regularPrice ??
    product.pricing?.[region]?.salePrice ??
    product.price;
  const catalogHasDiscount = pricedRegular > pricedSale;

  const timer = useIntroPriceTimer(product.id, {
    enabled: catalogHasDiscount,
    cmsEndDate: product.offer?.endDate,
    days: product.introTimerDays ?? 20,
    extensionHours: product.introTimerExtensionHours ?? 4,
    minutes: product.introTimerMinutes,
  });

  const offerLive = catalogHasDiscount && timer.offerActive;
  const singleSale = offerLive ? pricedSale : pricedRegular;
  const singleRegular = pricedRegular;
  const savings = Math.max(0, singleRegular - singleSale);

  const allImages = useMemo(
    () =>
      catalog
        .getProductsByType("AI_IMAGE")
        .filter((p): p is AiImageProductPublic => p.productType === "AI_IMAGE"),
    [catalog],
  );

  const library = useMemo(
    () => buildLibraryItems(allImages, region),
    [allImages, region],
  );

  const collectionPreviewImages =
    product.imageCollection?.previewImages ??
    pack?.previewImages ??
    packProduct?.previewImages ??
    [];

  const collectionCount =
    product.imageCollection?.imageCount ??
    pack?.imageCount ??
    packProduct?.imageCount ??
    collectionPreviewImages.length;

  const collectionTitle =
    product.imageCollection?.name ??
    pack?.title ??
    packProduct?.title ??
    "Full Collection";

  const dealSettings = product.dealSettings ?? {
    enableFullCollection: true,
    enableAddMoreImages: true,
    collectionBadgeText: "BEST VALUE",
    massiveCollectionThreshold: 12,
  };
  const pricingTiers =
    product.pricingTiers ?? catalog.imagePdpSettings.pricingTiers;

  const bundleQuote = getCollectionBundleQuote(
    singleSale,
    collectionCount,
    region,
    {
      saleInr: pack?.bundleSaleInr ?? packQuote?.current,
      saleUsd: pack?.bundleSaleUsd ?? packQuote?.current,
      compareInr:
        pack?.bundleCompareInr ??
        packQuote?.regular ??
        undefined,
      compareUsd:
        pack?.bundleCompareUsd ??
        packQuote?.regular ??
        undefined,
      badgeText: pack?.bundleBadgeText,
      massiveThreshold: dealSettings.massiveCollectionThreshold,
    },
  );

  const collectionCompare =
    region === "india"
      ? (pack?.bundleCompareInr ?? packQuote?.regular ?? bundleQuote.compare)
      : (pack?.bundleCompareUsd ?? packQuote?.regular ?? bundleQuote.compare);
  const collectionSale = packQuote
    ? offerLive
      ? packQuote.current
      : packQuote.regular || packQuote.current
    : bundleQuote.sale;
  const collectionSave = Math.max(0, collectionCompare - collectionSale);

  const showCollection =
    dealSettings.enableFullCollection &&
    Boolean(
      collectionCount > 1 &&
        (pack || product.imageCollection) &&
        packProduct &&
        packQuote,
    );

  const related = (
    product.recommendedProductIds ??
    product.relatedProductIds ??
    []
  )
    .map((id) => catalog.getProductById(id))
    .filter(Boolean)
    .filter((p) => p!.id !== product.id && p!.id !== pack?.productId)
    .slice(0, 4) as CatalogProduct[];

  const purchaseSingle = () => {
    const already = items.some(
      (i) => i.productId === product.id && !i.parentProductId,
    );
    if (!already) {
      addProduct(product, {
        open: false,
        customPriceInr: region === "india" ? singleSale : undefined,
      });
    }
    router.push("/checkout");
  };

  const purchase = (path: DealPath | null = dealPath) => {
    if (path === "collection" && packProduct) {
      const already = items.some(
        (i) => i.productId === packProduct.id && !i.parentProductId,
      );
      if (!already) {
        addProduct(packProduct, {
          open: false,
          customPriceInr: region === "india" ? collectionSale : undefined,
        });
      }
      router.push("/checkout");
      return;
    }

    const ids = [...selectedIds];
    if (ids.length > 1) {
      const products = ids
        .map((id) => catalog.getProductById(id))
        .filter(
          (p): p is AiImageProductPublic =>
            Boolean(p) && p!.productType === "AI_IMAGE",
        );
      const unitPrices = products.map((p) => {
        const q = getCatalogProductQuote(p, region);
        const live =
          Boolean(p.offer?.enabled) &&
          (p.pricing?.[region]?.regularPrice ?? q.regular) >
            (p.pricing?.[region]?.salePrice ?? q.current);
        return live ? q.current : q.regular;
      });
      const total = customDealPrice(
        products.length,
        singleSale,
        region,
        pricingTiers,
      );
      const linePrices = distributeLinePrices(total, unitPrices, region);
      for (let i = 0; i < products.length; i++) {
        const p = products[i]!;
        const already = items.some(
          (item) => item.productId === p.id && !item.parentProductId,
        );
        if (already) continue;
        addProduct(p, {
          open: false,
          customPriceInr: region === "india" ? linePrices[i] : undefined,
        });
      }
    } else {
      const already = items.some(
        (i) => i.productId === product.id && !i.parentProductId,
      );
      if (!already) {
        addProduct(product, {
          open: false,
          customPriceInr: region === "india" ? singleSale : undefined,
        });
      }
    }
    router.push("/checkout");
  };

  const tagline =
    product.salesHeadline?.trim() ||
    "One image. Endless ways to make it yours.";
  const ctaPrice = ready ? formatPrice(singleSale, region) : "—";

  return (
    <div className="space-y-7 lg:space-y-9">
      <section className="space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl lg:text-[2.55rem] lg:leading-[1.12]">
          {product.title}
        </h1>
        <p className="text-sm font-medium text-muted">{tagline}</p>
        <div className="flex flex-wrap gap-2">
          <MetaChip>{product.format || "PNG"}</MetaChip>
          <MetaChip>{formatRes(product.resolution)}</MetaChip>
          <MetaChip accent>⚡ Instant download</MetaChip>
        </div>
      </section>

      <section
        id="image-buy"
        className="offer-glow relative overflow-hidden rounded-[1.5rem] border border-accent/45 bg-surface p-5 sm:p-6"
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/15 blur-3xl"
          aria-hidden
        />

        <span
          className={cn(
            "relative inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white",
            !reduced && offerLive && "animate-save-badge",
          )}
        >
          🔥 {offerLive ? "LIMITED-TIME PRICE" : "CURRENT PRICE"}
        </span>

        {ready ? (
          <div className="relative mt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative inline-block">
                {!reduced && offerLive ? (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-2xl animate-price-glow" />
                ) : null}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={singleSale}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative font-display text-5xl font-bold tabular-nums text-text sm:text-[3.5rem]"
                  >
                    {formatPrice(singleSale, region)}
                  </motion.p>
                </AnimatePresence>
              </div>
              {offerLive && savings > 0 ? (
                <p className="pb-1 text-xl text-muted line-through tabular-nums sm:text-2xl">
                  {formatPrice(singleRegular, region)}
                </p>
              ) : null}
            </div>

            {savings > 0 && offerLive ? (
              <motion.span
                initial={reduced ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 inline-flex rounded-full bg-accent px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-white"
              >
                Save {formatPrice(savings, region)}
              </motion.span>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 h-16 w-44 animate-pulse rounded bg-surface-2" />
        )}

        {offerLive &&
        timer.hydrated &&
        timer.countdown &&
        !timer.countdown.expired ? (
          <div className="relative mt-5">
            <PromoCountdownBlocks
              countdown={timer.countdown}
              phase={timer.phase}
              reduced={reduced}
            />
          </div>
        ) : timer.hydrated && timer.expired && catalogHasDiscount ? (
          <p className="mt-4 text-sm font-medium text-muted">
            Limited-time price has ended — standard pricing applies.
          </p>
        ) : null}

        <ul className="mt-5 space-y-1.5 text-xs font-medium text-muted">
          {[
            "Instant download after checkout",
            "Full-resolution PNG",
            "Ready to use in your next creation",
          ].map((line) => (
            <li key={line} className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              {line}
            </li>
          ))}
        </ul>

        <div className="relative mt-5">
          {!reduced ? (
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/35 blur-2xl cta-heartbeat-glow" />
          ) : null}
          <button
            type="button"
            onClick={purchaseSingle}
            className="cta-heartbeat relative w-full rounded-full bg-accent py-4 text-base font-bold text-white transition hover:brightness-110"
          >
            ⚡ GET IT NOW — {ctaPrice}
          </button>
        </div>
        <p className="mt-2 text-center text-xs font-medium text-muted">
          Instant access. No waiting.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/80 pt-4 text-center">
          {[
            { icon: "⚡", label: "Download instantly" },
            { icon: "🎨", label: "Ready to create with" },
            { icon: "🔒", label: "Yours after checkout" },
          ].map((item) => (
            <p
              key={item.label}
              className="text-[10px] font-semibold leading-snug text-muted"
            >
              <span aria-hidden>{item.icon} </span>
              {item.label}
            </p>
          ))}
        </div>
      </section>

      <ImageBuildYourDeal
        dealPath={dealPath}
        onDealPathChange={onDealPathChange}
        selectedIds={selectedIds}
        onSelectedChange={onSelectedIdsChange}
        currentProductId={product.id}
        productTitle={product.title}
        library={library}
        singleSale={singleSale}
        singleRegular={singleRegular}
        region={region}
        ready={ready}
        onPurchase={purchase}
        onBrowseCollection={onBrowseCollection}
        pricingTiers={pricingTiers}
        enableAddMoreImages={dealSettings.enableAddMoreImages}
        collection={
          showCollection
            ? {
                title: collectionTitle,
                imageCount: collectionCount,
                previewImages: collectionPreviewImages,
                comparePrice: collectionCompare,
                salePrice: collectionSale,
                saveAmount: collectionSave,
                badge: bundleQuote.badge,
              }
            : undefined
        }
      />

      <CreatePossibilitiesBento />

      {related.length > 0 ? (
        <section className="space-y-3 border-t border-border pt-8">
          <h2 className="font-display text-lg font-bold tracking-tight text-text">
            More images you might want
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`${PRODUCT_TYPE_CONFIG[p.productType].href}/${p.slug}`}
                className="group"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-border transition group-hover:ring-accent/40">
                  <CoverImage
                    src={p.thumbnail}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <p className="mt-2 truncate text-xs font-semibold text-text">
                  {p.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
