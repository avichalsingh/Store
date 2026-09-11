"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogProduct, VideoProduct } from "@/types";
import { useCatalog } from "@/catalog/useCatalog";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { getCatalogProductQuote, getVideoQuote } from "@/lib/pricing";
import { ViralPerformanceCard } from "@/components/products/ViralPerformanceCard";
import { LaunchOfferCard } from "@/components/products/LaunchOfferCard";
import { WhyItWorks } from "@/components/products/pdp/WhyItWorks";
import { FormatActivity } from "@/components/products/pdp/FormatActivity";
import { WhatYouGet } from "@/components/products/pdp/WhatYouGet";
import { VideoAddOns } from "@/components/products/pdp/VideoAddOns";
import { VideoOrderSummary } from "@/components/products/pdp/VideoOrderSummary";

function addOnPrice(
  parent: VideoProduct,
  addOn: CatalogProduct,
  region: "india" | "international",
) {
  const base = getCatalogProductQuote(addOn, region);
  const override = parent.addOnPriceOverrides?.[addOn.id];
  if (region === "india" && override?.customPriceInr != null) {
    return override.customPriceInr;
  }
  if (region === "international" && override?.customPriceUsd != null) {
    return override.customPriceUsd;
  }
  return base.current;
}

function addOnSummaryLabel(product: CatalogProduct) {
  if (product.productType === "CAPTION_PACK") return "Caption + Hashtag Pack";
  return product.title;
}

function categoryLine(video: VideoProduct) {
  const base = video.category?.trim() || "Hip Hop";
  return `${base.toUpperCase()} • HIGH-RETENTION FORMAT`;
}

export function ProductBuyColumn({ video }: { video: VideoProduct }) {
  const { getProductById } = useCatalog();
  const { region, ready } = useRegion();
  const quote = getVideoQuote(video, region);
  const { addVideo, addProductWithAddOns, items } = useCart();
  const router = useRouter();

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const addOnLines = useMemo(() => {
    return (video.addOnProductIds ?? [])
      .map((id) => getProductById(id))
      .filter(Boolean)
      .map((product) => ({
        product: product as CatalogProduct,
        price: addOnPrice(video, product as CatalogProduct, region),
      }));
  }, [video, getProductById, region]);

  const selectedAddOns = addOnLines.filter((a) => selected[a.product.id]);
  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const total = quote.current + addOnTotal;
  const savingsAmount = Math.max(0, quote.regular - quote.current);

  const toggleAddOn = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const buyNow = () => {
    const already = items.some(
      (i) => i.productId === video.id && !i.parentProductId,
    );
    if (selectedAddOns.length > 0) {
      addProductWithAddOns(
        video,
        selectedAddOns.map((a) => ({
          product: a.product,
          customPriceInr:
            region === "india"
              ? a.price
              : video.addOnPriceOverrides?.[a.product.id]?.customPriceInr,
        })),
        { open: false },
      );
    } else if (!already) {
      addVideo(video, { open: false });
    }
    router.push("/checkout");
  };

  const rating = video.creatorRating ?? 4.9;

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* 1 — Product identity */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          TRENDING FORMAT
        </p>

        <h1 className="font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
          {video.title}
        </h1>

        <div className="flex items-center gap-1.5 text-sm text-text-dim">
          <span className="tracking-tight text-accent" aria-hidden>
            ★★★★★
          </span>
          <span className="ml-1 tabular-nums">
            {rating.toFixed(1)} creator rating
          </span>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {categoryLine(video)}
        </p>

        <p className="max-w-xl text-base leading-relaxed text-muted">
          {video.description}
        </p>
      </section>

      {/* 2 — Trend / social proof */}
      {video.performance ? (
        <ViralPerformanceCard performance={video.performance} />
      ) : null}

      {/* 3 — Why it works */}
      <WhyItWorks video={video} />

      {/* 4 — Format activity */}
      <FormatActivity activity={video.activity} />

      {/* 5 — Your purchase includes */}
      <WhatYouGet video={video} />

      {/* 6 — Launch offer / urgency / CTA */}
      <LaunchOfferCard
        quote={quote}
        offer={video.offer}
        showCta
        onBuy={buyNow}
      />

      {/* 7 — Optional add-ons */}
      <VideoAddOns
        addOns={addOnLines}
        selectedIds={new Set(Object.keys(selected).filter((k) => selected[k]))}
        onToggle={toggleAddOn}
        region={region}
        ready={ready}
      />

      {/* 8 — Final order summary */}
      <VideoOrderSummary
        lines={[
          {
            id: "video",
            label: `${video.title} Video`,
            amount: quote.current,
          },
          ...selectedAddOns.map((a) => ({
            id: a.product.id,
            label: addOnSummaryLabel(a.product),
            amount: a.price,
          })),
        ]}
        total={total}
        region={region}
        ready={ready}
        onBuy={buyNow}
        savingsAmount={quote.saleActive ? savingsAmount : 0}
        regularPrice={quote.saleActive ? quote.regular : undefined}
      />
    </div>
  );
}
