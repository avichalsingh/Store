"use client";

import { useRouter } from "next/navigation";
import {
  Compass,
  Fingerprint,
  Lock,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { PromptProductPublic } from "@/types";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { getCatalogProductQuote } from "@/lib/pricing";
import { ProductAddOnsSection } from "@/components/products/ProductAddOnsSection";
import { PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";
import { cn } from "@/lib/utils";
import {
  promptDisplayTitle,
  promptPeekSections,
  promptUnlockItems,
  promptUseCases,
} from "@/components/products/prompt-pdp/promptCopy";
import { PromptPurchaseCard } from "@/components/products/prompt-pdp/PromptPurchaseCard";

const OUTCOME_ICONS = [Sparkles, Fingerprint, Wand2, Compass] as const;

export function PromptBuyColumn({ product }: { product: PromptProductPublic }) {
  const { region } = useRegion();
  const quote = getCatalogProductQuote(product, region);
  const { addProduct, addProductWithAddOns, items } = useCart();
  const router = useRouter();
  const config = PRODUCT_TYPE_CONFIG.PROMPT;
  const supportsAddOns = config.supportsAddOns;
  const addOnIds = product.addOnProductIds ?? [];
  const inCart = items.some(
    (i) => i.productId === product.id && !i.parentProductId,
  );

  const title = promptDisplayTitle(product);
  const unlocks = promptUnlockItems(product).slice(0, 3);
  const peek = promptPeekSections(product);
  const useCases = promptUseCases(product);
  const support =
    product.shortDescription?.trim() ||
    (product.description?.trim() &&
    !/you are buying|unlock after purchase|full generation prompt/i.test(
      product.description,
    )
      ? product.description.trim()
      : "") ||
    "";

  const buyNow = () => {
    if (!inCart) addProduct(product, { open: false });
    router.push("/checkout");
  };

  const addToCart = () => {
    if (supportsAddOns && addOnIds.length > 0) {
      addProductWithAddOns(product, []);
    } else {
      addProduct(product);
    }
  };

  return (
    <div className="space-y-12">
      {/* Identity */}
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Prompt
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
          {title}
        </h1>

        {support ? (
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            {support.length > 160
              ? `${support.slice(0, 157).trimEnd()}…`
              : support}
          </p>
        ) : null}
      </header>

      <PromptPurchaseCard
        quote={quote}
        offer={product.offer}
        inCart={inCart}
        onBuyNow={buyNow}
        onAddToCart={addToCart}
      />

      {/* Outcomes — editorial cards, not divider rows */}
      <section aria-labelledby="prompt-unlocks-heading">
        <h2
          id="prompt-unlocks-heading"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
        >
          What you can create
        </h2>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {unlocks.map((item, i) => {
            const Icon = OUTCOME_ICONS[i % OUTCOME_ICONS.length]!;
            return (
              <li
                key={item.title}
                className="rounded-2xl bg-surface-2/80 px-4 py-4 ring-1 ring-border/60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon size={15} strokeWidth={2} aria-hidden />
                </span>
                <p className="mt-3 text-sm font-semibold leading-snug text-text">
                  {item.title}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {item.detail}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Blueprint preview */}
      <section aria-labelledby="prompt-peek-heading">
        <div className="relative overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              background:
                "linear-gradient(160deg, color-mix(in oklab, var(--accent) 7%, transparent) 0%, transparent 42%)",
            }}
          />

          <div className="relative flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5 sm:px-6">
            <div>
              <h2
                id="prompt-peek-heading"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-text"
              >
                A look inside
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Partially revealed creative system
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
              <Lock size={10} aria-hidden />
              Locked
            </span>
          </div>

          <div className="relative space-y-0 px-5 py-2 sm:px-6">
            {peek.map((section, index) => (
              <div
                key={section.label}
                className={cn(
                  "py-4",
                  index < peek.length - 1 && "border-b border-border/50",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent/90">
                  {section.label}
                </p>
                {section.locked ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <div
                      aria-hidden
                      className="h-2.5 min-w-[7rem] flex-1 max-w-xs overflow-hidden rounded-sm bg-surface-2"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(90deg, transparent 0 5px, color-mix(in oklab, var(--muted) 40%, transparent) 5px 9px)",
                      }}
                    />
                    <p className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-muted">
                      <Lock size={12} className="text-accent" aria-hidden />
                      Unlock to reveal
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-[13px] leading-relaxed text-text-dim">
                    {section.preview}
                    <span className="text-muted"> …</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quiet trust */}
      <section aria-labelledby="prompt-why-heading" className="pb-1">
        <h2
          id="prompt-why-heading"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
        >
          Why start from scratch?
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
          A good prompt can save dozens of failed generations.
        </p>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2/60 px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Built for
            </dt>
            <dd className="mt-1 text-sm text-text">{useCases.builtFor}</dd>
          </div>
          <div className="rounded-xl bg-surface-2/60 px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Best for
            </dt>
            <dd className="mt-1 text-sm text-text">{useCases.bestFor}</dd>
          </div>
        </dl>
      </section>

      {supportsAddOns ? (
        <ProductAddOnsSection
          product={product}
          primaryLabel="Add with selected add-ons"
        />
      ) : null}
    </div>
  );
}
