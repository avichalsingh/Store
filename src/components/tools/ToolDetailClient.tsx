"use client";

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { Badge } from "@/components/ui/Badge";
import { useToolsCatalog } from "@/catalog/tools/useToolsCatalog";
import {
  TOOL_CATEGORY_CONFIG,
  toolDiscountPercent,
  type AiTool,
} from "@/catalog/tools/types";
import { isToolOfferLive } from "@/catalog/tools/homepageDeals";

const PRICING_LABEL: Record<AiTool["pricing"]["pricingType"], string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  enterprise: "Enterprise",
};

function formatMoney(
  amount: number | undefined,
  currency: AiTool["pricing"]["currency"],
): string | null {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

function formatChecked(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ToolDetailClient({ slug }: { slug: string }) {
  const { getBySlug, settings, hydrated } = useToolsCatalog();
  const tool = getBySlug(slug);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold">Tool not found</h1>
        <p className="mt-2 text-muted">
          This tool may be draft, inactive, or removed from the catalog.
        </p>
        <Link
          href="/tools"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Browse Tools
        </Link>
      </div>
    );
  }

  const category = TOOL_CATEGORY_CONFIG[tool.primaryCategory];
  const onSale = isToolOfferLive(tool);
  const discount = onSale ? toolDiscountPercent(tool) : undefined;
  const demoPricing =
    tool.dataOrigin === "demo" || tool.pricing.origin === "demo";
  const goHref = `/tools/go/${tool.id}?src=tool_detail`;
  const ctaLabel =
    onSale && tool.offer.offerCtaText
      ? tool.offer.offerCtaText
      : "Visit official site";
  const lastChecked = formatChecked(tool.monitoring.lastCheckedAt);
  const gallery =
    tool.galleryUrls.length > 0
      ? tool.galleryUrls
      : tool.coverImageUrl
        ? [tool.coverImageUrl]
        : [];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <p className="mb-6 text-sm text-muted">
        <Link href="/tools" className="transition hover:text-accent">
          Tools
        </Link>
        <span className="mx-2 text-border">/</span>
        <span className="text-text">{tool.name}</span>
      </p>

      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div className="space-y-3 lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border">
            {gallery[0] ? (
              <CoverImage
                src={gallery[0]}
                alt=""
                fill
                className="object-cover"
                sizes="420px"
                priority
              />
            ) : null}
            {tool.logoUrl ? (
              <div className="absolute bottom-4 left-4 h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-white/25 bg-surface">
                <CoverImage
                  src={tool.logoUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(0, 4).map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-border"
                >
                  <CoverImage src={src} alt="" fill sizes="90px" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="soft">{category.label}</Badge>
            <Badge tone="soft">
              {PRICING_LABEL[tool.pricing.pricingType]}
            </Badge>
            {tool.pricing.freeTrialAvailable ? (
              <Badge tone="soft">Free trial</Badge>
            ) : null}
            {onSale ? <Badge tone="accent">Sale</Badge> : null}
            {tool.featured ? <Badge tone="soft">Featured</Badge> : null}
            {tool.recommended ? <Badge tone="soft">Recommended</Badge> : null}
            {tool.editorsPick ? <Badge tone="soft">Editors pick</Badge> : null}
            {discount != null ? (
              <Badge tone="accent">-{discount}%</Badge>
            ) : null}
          </div>

          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {tool.name}
          </h1>
          <p className="mt-3 text-lg text-muted">{tool.shortDescription}</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            Best for · {tool.bestFor}
          </p>

          <div className="mt-8 space-y-3">
            <h2 className="font-display text-xl font-bold">About</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-dim">
              {tool.fullDescription}
            </p>
          </div>

          {tool.features.length > 0 ? (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold">Features</h2>
              <ul className="mt-3 space-y-2">
                {tool.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2 text-sm text-text-dim"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-xl font-bold">Pricing</h2>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              {onSale && tool.offer.regularPrice != null ? (
                <span className="text-muted line-through">
                  {formatMoney(tool.offer.regularPrice, tool.pricing.currency)}
                </span>
              ) : null}
              <span className="text-2xl font-bold text-text">
                {onSale && tool.offer.salePrice != null
                  ? formatMoney(tool.offer.salePrice, tool.pricing.currency)
                  : formatMoney(
                      tool.pricing.currentPrice,
                      tool.pricing.currency,
                    ) || PRICING_LABEL[tool.pricing.pricingType]}
              </span>
              {tool.pricing.billingPeriod &&
              tool.pricing.billingPeriod !== "unknown" ? (
                <span className="text-sm text-muted">
                  / {tool.pricing.billingPeriod.replace("_", " ")}
                </span>
              ) : null}
            </div>
            {tool.pricing.freeTrialAvailable && tool.pricing.freeTrialDetails ? (
              <p className="mt-2 text-sm text-accent">
                {tool.pricing.freeTrialDetails}
              </p>
            ) : null}
            {tool.pricing.pricingNotes ? (
              <p className="mt-2 text-sm text-muted">{tool.pricing.pricingNotes}</p>
            ) : null}
            {demoPricing ? (
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Demo pricing
              </p>
            ) : null}
          </div>

          {onSale ? (
            <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
              <h2 className="font-display text-xl font-bold">
                {tool.offer.saleTitle || "Current offer"}
              </h2>
              {tool.offer.offerDescription ? (
                <p className="mt-2 text-sm text-text-dim">
                  {tool.offer.offerDescription}
                </p>
              ) : null}
              {tool.offer.saleEndDate ? (
                <p className="mt-2 text-xs text-muted">
                  Ends{" "}
                  {formatChecked(tool.offer.saleEndDate)?.split(",")[0] ??
                    tool.offer.saleEndDate}
                </p>
              ) : null}
              {tool.offer.origin === "demo" ? (
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  Demo offer
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={goHref}
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {ctaLabel}
            </Link>
            <a
              href={tool.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-text transition hover:border-accent/40 hover:text-accent"
            >
              Official site
            </a>
          </div>

          {lastChecked ? (
            <p className="mt-4 text-xs text-muted">
              Last checked · {lastChecked}
            </p>
          ) : null}

          {settings.affiliateDisclosureEnabled ? (
            <p className="mt-6 text-xs leading-relaxed text-muted">
              {settings.affiliateDisclosureText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
