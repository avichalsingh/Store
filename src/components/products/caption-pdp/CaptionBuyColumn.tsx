"use client";

import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/types";
import type { CaptionPackView } from "@/components/products/caption-pdp/captionPackView";
import { captionPurchaseValueItems } from "@/components/products/caption-pdp/captionPackView";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { getCatalogProductQuote } from "@/lib/pricing";
import { PackPurchaseCard } from "@/components/products/shared/PackPurchaseCard";
import { CaptionPreviewStage } from "@/components/products/caption-pdp/CaptionPreviewStage";

export function CaptionBuyColumn({
  product,
  catalogProduct,
}: {
  product: CaptionPackView;
  catalogProduct: CatalogProduct;
}) {
  const { region } = useRegion();
  const quote = getCatalogProductQuote(catalogProduct, region);
  const { addProduct, items } = useCart();
  const router = useRouter();
  const inCart = items.some(
    (i) => i.productId === catalogProduct.id && !i.parentProductId,
  );

  const buyNow = () => {
    if (!inCart) addProduct(catalogProduct, { open: false });
    router.push("/checkout");
  };

  const addToCart = () => addProduct(catalogProduct);

  const short = product.shortDescription?.trim() || "";
  const long = product.description?.trim() || "";

  return (
    <div>
      <header className="border-b border-border/50 pb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Caption pack
          </p>
          {(product.isNew || product.isTrending) && (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              {[
                product.isNew ? "New" : null,
                product.isTrending ? "Trending" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {product.title}
        </h1>

        {(() => {
          const summary = short || long;
          const showLongSection = Boolean(short && long && long !== short);
          if (!summary && !showLongSection) return null;
          return (
            <>
              {summary ? (
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                  {summary.length > 180
                    ? `${summary.slice(0, 177).trimEnd()}…`
                    : summary}
                </p>
              ) : null}
              {showLongSection ? (
                <div className="mt-5 max-w-xl rounded-xl border border-border/50 bg-surface-2/40 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                    About this pack
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {long}
                  </p>
                </div>
              ) : null}
            </>
          );
        })()}

        <div className="mt-5 flex flex-wrap gap-2">
          {product.category ? (
            <span className="rounded-full border border-border bg-surface-2/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {product.category}
            </span>
          ) : null}
          {product.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1 text-[11px] font-medium text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className="pt-10">
        <CaptionPreviewStage product={product} />
      </div>

      <div className="mt-16 lg:mt-20">
        <PackPurchaseCard
          quote={quote}
          offer={product.offer}
          inCart={inCart}
          onBuyNow={buyNow}
          onAddToCart={addToCart}
          unlockHeading="Unlock the full pack"
          ctaLabel="Unlock the full pack"
          valueItems={captionPurchaseValueItems(product)}
          headingId="caption-unlock-heading"
          showTrending={product.isTrending}
          showFeatured={product.isFeatured}
          productId={catalogProduct.id}
        />
      </div>
    </div>
  );
}
