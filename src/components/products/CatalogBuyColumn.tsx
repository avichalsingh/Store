"use client";

import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/types";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { formatPrice, getCatalogProductQuote } from "@/lib/pricing";
import { LaunchOfferCard } from "@/components/products/LaunchOfferCard";
import { ProductAddOnsSection } from "@/components/products/ProductAddOnsSection";
import { Badge } from "@/components/ui/Badge";
import {
  PRODUCT_TYPE_CONFIG,
  type ProductType,
} from "@/catalog/productTypes";
import { CoverImage } from "@/components/ui/CoverImage";
import { Lock } from "lucide-react";

export function CatalogBuyColumn({ product }: { product: CatalogProduct }) {
  const { region, ready } = useRegion();
  const quote = getCatalogProductQuote(product, region);
  const { addProduct, addProductWithAddOns, items } = useCart();
  const router = useRouter();
  const config = PRODUCT_TYPE_CONFIG[product.productType];
  const supportsAddOns = config.supportsAddOns;
  const addOnIds = product.addOnProductIds ?? [];
  const inCart = items.some(
    (i) => i.productId === product.id && !i.parentProductId,
  );

  const buyNow = () => {
    if (!inCart) {
      addProduct(product, { open: false });
    }
    router.push("/checkout");
  };

  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {config.singular}
      </p>

      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {product.title}
      </h1>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{product.category || config.label}</Badge>
        {product.isNew && <Badge tone="soft">New</Badge>}
        {product.isTrending && <Badge>Trending</Badge>}
      </div>

      <p className="max-w-xl text-base leading-relaxed text-muted">
        {product.description}
      </p>

      <ProductTypeHighlights product={product} />

      <LaunchOfferCard quote={quote} offer={product.offer} />

      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl font-bold tabular-nums">
          {ready ? formatPrice(quote.current, region) : "—"}
        </span>
        {quote.saleActive && (
          <span className="text-sm text-muted line-through tabular-nums">
            {formatPrice(quote.regular, region)}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={buyNow}
        className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Buy now
      </button>
      <button
        type="button"
        disabled={inCart}
        onClick={() => {
          if (supportsAddOns && addOnIds.length > 0) {
            addProductWithAddOns(product, []);
          } else {
            addProduct(product);
          }
        }}
        className="w-full rounded-full border border-border py-3 text-sm font-medium text-text transition hover:border-accent/40 disabled:opacity-50"
      >
        {inCart ? "In cart" : "Add to cart"}
      </button>

      {supportsAddOns && (
        <ProductAddOnsSection
          product={product}
          primaryLabel="Add with selected add-ons"
        />
      )}

      {product.productType === "BUNDLE" && (
        <BundleIncludes product={product} regionReady={ready} region={region} />
      )}
    </div>
  );
}

function ProductTypeHighlights({ product }: { product: CatalogProduct }) {
  if (product.productType === "PROMPT") {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          You&apos;re buying the prompt
        </p>
        <p className="text-sm text-muted">
          {product.canGenerate
            ? `Generates: ${product.canGenerate}`
            : "Full prompt text, negative prompt, and settings unlock after purchase."}
        </p>
        <div className="rounded-xl border border-dashed border-border bg-surface/60 p-3 font-mono text-xs leading-relaxed text-text-dim">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Lock size={12} /> Preview
          </span>
          <p className="mt-2">
            {product.publicTeaser || "Prompt teaser locked until purchase…"}
            <span className="text-muted"> ░░░</span>
          </p>
        </div>
        {product.sectionCount ? (
          <p className="text-xs text-muted">
            {product.sectionCount} prompt section
            {product.sectionCount === 1 ? "" : "s"} included
          </p>
        ) : null}
      </div>
    );
  }

  if (product.productType === "CAPTION_PACK") {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
        <p className="text-sm font-semibold text-text">
          {product.itemCount} caption + hashtag combos
          {product.styleLabels.length
            ? ` · ${product.styleLabels.slice(0, 3).join(", ")}`
            : ""}
        </p>
        <ul className="space-y-3">
          {(product.previewItems ?? []).slice(0, 3).map((item) => (
            <li
              key={item.captionLead}
              className="rounded-xl bg-surface px-3 py-2 text-sm text-text"
            >
              <p>
                {item.captionLead}
                {item.hasMoreCaption ? "…" : ""}
              </p>
              {item.visibleHashtag ? (
                <p className="mt-1.5 text-xs text-muted">{item.visibleHashtag}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Lock size={12} /> Full pack unlocks after purchase
        </p>
      </div>
    );
  }

  if (product.productType === "AI_IMAGE") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {product.previewImages.slice(0, 4).map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-border"
            >
              <CoverImage src={src} alt="" fill sizes="80px" />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          {product.imageCount} downloadable image
          {product.imageCount === 1 ? "" : "s"}
          {product.resolution ? ` · ${product.resolution}` : ""}
          {product.format ? ` · ${product.format}` : ""}
        </p>
      </div>
    );
  }

  return null;
}

function BundleIncludes({
  product,
  region,
  regionReady,
}: {
  product: Extract<CatalogProduct, { productType: "BUNDLE" }>;
  region: "india" | "international";
  regionReady: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-end justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Included</h3>
        {product.savings > 0 && (
          <Badge>
            Save{" "}
            {regionReady
              ? formatPrice(product.savings, region)
              : `$${product.savings.toFixed(0)}`}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        Individual total{" "}
        {regionReady
          ? formatPrice(product.individualTotal, region)
          : `$${product.individualTotal.toFixed(2)}`}{" "}
        · Bundle price{" "}
        {regionReady
          ? formatPrice(product.price, region)
          : `$${product.price.toFixed(2)}`}
      </p>
      <ul className="mt-4 space-y-3">
        {product.includedSummaries.map((inc) => {
          const type = inc.productType as ProductType;
          return (
            <li key={inc.id} className="flex items-center gap-3">
              <div className="relative h-12 w-9 overflow-hidden rounded-lg">
                <CoverImage src={inc.thumbnail} alt="" fill sizes="36px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{inc.title}</p>
                <p className="text-[11px] text-muted">
                  {PRODUCT_TYPE_CONFIG[type]?.singular ?? inc.productType}
                </p>
              </div>
              <Badge tone="neutral">
                {PRODUCT_TYPE_CONFIG[type]?.singular ?? "Item"}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
