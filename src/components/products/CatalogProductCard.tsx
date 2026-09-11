"use client";

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { ProductPrice } from "@/components/ui/ProductPrice";
import { Badge } from "@/components/ui/Badge";
import { VideoCard } from "@/components/products/VideoCard";
import { productPdpHref, PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";
import type { CatalogProduct, VideoProduct } from "@/types";
import { cn } from "@/lib/utils";

type CatalogProductCardProps = {
  product: CatalogProduct;
  className?: string;
};

const TYPE_COVER: Record<
  Exclude<CatalogProduct["productType"], "VIDEO">,
  string
> = {
  AI_IMAGE: "from-[#1a2433] via-[#2a3a4a] to-[#0f1419]",
  PROMPT: "from-[#1e1a2e] via-[#2d2450] to-[#12101c]",
  CAPTION_PACK: "from-[#1a2420] via-[#243830] to-[#101612]",
  BUNDLE: "from-[#2a1f14] via-[#3d2a18] to-[#14100c]",
};

export function CatalogProductCard({
  product,
  className,
}: CatalogProductCardProps) {
  if (product.productType === "VIDEO") {
    return (
      <VideoCard
        video={product as VideoProduct}
        className={cn("w-auto", className)}
      />
    );
  }

  const config = PRODUCT_TYPE_CONFIG[product.productType];
  const href = productPdpHref(product.productType, product.slug);
  const meta = cardMeta(product);
  const typographyCover =
    product.productType === "CAPTION_PACK" || product.productType === "PROMPT";

  return (
    <article className={cn("group flex flex-col", className)}>
      <Link
        href={href}
        className="relative block overflow-hidden rounded-2xl ring-1 ring-border transition duration-300 hover:ring-accent/45"
      >
        <div className="relative aspect-[4/5] bg-surface-2">
          {typographyCover ? (
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br",
                TYPE_COVER[product.productType],
              )}
            >
              {product.thumbnail ? (
                <CoverImage
                  src={product.thumbnail}
                  alt=""
                  fill
                  className="object-cover opacity-35 mix-blend-luminosity transition duration-500 group-hover:scale-[1.04]"
                  sizes="220px"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 top-10 flex flex-col justify-end">
                <p className="font-display text-[15px] font-bold leading-snug text-white line-clamp-3">
                  {product.productType === "PROMPT"
                    ? product.publicTeaser || product.title
                    : product.previewItems?.[0]?.captionLead || product.title}
                </p>
                {product.productType === "CAPTION_PACK" &&
                product.previewItems?.[0]?.visibleHashtag ? (
                  <p className="mt-2 line-clamp-2 text-xs text-white/70">
                    {product.previewItems[0].visibleHashtag}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {product.thumbnail ? (
                <CoverImage
                  src={product.thumbnail}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="220px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                  {config.singular}
                </div>
              )}
              {product.productType === "BUNDLE" ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/85">
                    {product.includedSummaries.length} items · save $
                    {Math.max(0, Math.round(product.savings))}
                  </p>
                </div>
              ) : null}
              {product.productType === "AI_IMAGE" && product.imageCount > 1 ? (
                <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  {product.imageCount} images
                </div>
              ) : null}
            </>
          )}
          <div className="absolute left-2.5 top-2.5">
            <Badge tone="neutral">{config.singular}</Badge>
          </div>
        </div>
      </Link>
      <div className="mt-3 space-y-1 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {meta}
        </p>
        <Link href={href}>
          <h3 className="truncate text-sm font-semibold text-text transition hover:text-accent">
            {product.title}
          </h3>
        </Link>
        <ProductPrice product={product} />
      </div>
    </article>
  );
}

function cardMeta(product: CatalogProduct): string {
  switch (product.productType) {
    case "CAPTION_PACK":
      return `${product.itemCount} caption + hashtag combos`;
    case "AI_IMAGE":
      return `${product.imageCount} image${product.imageCount === 1 ? "" : "s"}`;
    case "PROMPT":
      return product.canGenerate || "Full prompt unlock";
    case "BUNDLE":
      return `${product.includedProductIds.length} included`;
    default:
      return PRODUCT_TYPE_CONFIG[product.productType].singular;
  }
}
