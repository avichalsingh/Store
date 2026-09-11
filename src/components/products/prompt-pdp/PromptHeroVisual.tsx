"use client";

import type { PromptProductPublic } from "@/types";
import { CoverImage } from "@/components/ui/CoverImage";
import { promptHeroHook } from "@/components/products/prompt-pdp/promptCopy";

export function PromptHeroVisual({ product }: { product: PromptProductPublic }) {
  const hook = promptHeroHook(product);

  return (
    <div className="relative">
      {/* Soft product spotlight — contained to the card, not the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[1.75rem] opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 80%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 70%)",
        }}
      />

      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
        {product.thumbnail ? (
          <CoverImage
            src={product.thumbnail}
            alt=""
            fill
            className="object-cover scale-[1.02] opacity-[0.55] mix-blend-luminosity"
            sizes="(max-width: 1024px) 90vw, 380px"
            priority
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(145deg, color-mix(in oklab, var(--accent) 12%, transparent) 0%, transparent 38%)",
          }}
        />

        <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Locked
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Prompt
          </p>
          <p className="mt-3 max-w-[17ch] font-display text-[1.7rem] font-bold leading-[1.12] tracking-tight text-white sm:text-[1.85rem]">
            {hook}
          </p>
          <p className="mt-4 text-sm text-white/70">
            Full prompt unlocks after purchase
          </p>
        </div>
      </div>
    </div>
  );
}
