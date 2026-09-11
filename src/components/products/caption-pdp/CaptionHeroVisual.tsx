"use client";

import type { CaptionPackView } from "@/components/products/caption-pdp/captionPackView";
import { captionItemCount } from "@/components/products/caption-pdp/captionPackView";
import { CoverImage } from "@/components/ui/CoverImage";
import { cn } from "@/lib/utils";

export function CaptionHeroVisual({ product }: { product: CaptionPackView }) {
  const hook =
    product.previewItems?.[0]?.captionLead || product.title;
  const count = captionItemCount(product);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[1.75rem] opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 80%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%)",
        }}
      />

      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
        {product.thumbnail ? (
          <CoverImage
            src={product.thumbnail}
            alt=""
            fill
            className="object-cover scale-[1.02] opacity-[0.5] mix-blend-luminosity"
            sizes="(max-width: 1024px) 90vw, 380px"
            priority
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "linear-gradient(145deg, color-mix(in oklab, var(--accent) 14%, transparent) 0%, transparent 42%)",
          }}
        />

        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
          {count} combos
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Caption pack
          </p>
          <p
            className={cn(
              "mt-3 font-display font-bold leading-[1.12] tracking-tight text-white",
              hook.length > 40 ? "text-xl sm:text-2xl" : "text-2xl sm:text-[1.65rem]",
            )}
            aria-label="Partial caption preview"
          >
            {hook}
            {product.previewItems?.[0]?.hasMoreCaption ? (
              <span className="text-white/45">…</span>
            ) : null}
          </p>
          <p className="mt-4 text-sm text-white/70">
            Each item includes a caption + matching hashtags
          </p>
        </div>
      </div>
    </div>
  );
}
