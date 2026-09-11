"use client";

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { Badge } from "@/components/ui/Badge";
import {
  TOOL_CATEGORY_CONFIG,
  toolDiscountPercent,
  type AiTool,
} from "@/catalog/tools/types";
import { isToolOfferLive } from "@/catalog/tools/homepageDeals";
import { cn } from "@/lib/utils";

type ToolCardProps = {
  tool: AiTool;
  className?: string;
  /** Click source for outbound CTA; defaults to tools_browse */
  goSrc?: "tools_browse" | "homepage_deals" | "search" | "other";
};

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

export function ToolCard({
  tool,
  className,
  goSrc = "tools_browse",
}: ToolCardProps) {
  const detailHref = `/tools/${tool.slug}`;
  const goHref = `/tools/go/${tool.id}?src=${goSrc}`;
  const category = TOOL_CATEGORY_CONFIG[tool.primaryCategory];
  const onSale = isToolOfferLive(tool);
  const discount = onSale ? toolDiscountPercent(tool) : undefined;
  const logo = tool.logoUrl || tool.coverImageUrl;
  const ctaLabel =
    onSale && tool.offer.offerCtaText
      ? tool.offer.offerCtaText
      : "Visit site";

  const priceLabel =
    onSale && tool.offer.salePrice != null
      ? formatMoney(tool.offer.salePrice, tool.pricing.currency)
      : formatMoney(tool.pricing.currentPrice, tool.pricing.currency);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-accent/40",
        className,
      )}
    >
      <Link href={detailHref} className="relative block">
        <div className="relative aspect-[16/10] bg-surface-2">
          {tool.coverImageUrl ? (
            <CoverImage
              src={tool.coverImageUrl}
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes="320px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2433] via-[#243040] to-[#0f1419]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{category.label}</Badge>
            {onSale && discount != null ? (
              <Badge tone="accent">-{discount}%</Badge>
            ) : null}
          </div>
          {logo ? (
            <div className="absolute bottom-3 left-3 h-12 w-12 overflow-hidden rounded-xl ring-2 ring-white/20 bg-surface">
              <CoverImage
                src={logo}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="soft">{PRICING_LABEL[tool.pricing.pricingType]}</Badge>
          {tool.pricing.freeTrialAvailable ? (
            <Badge tone="soft">Free trial</Badge>
          ) : null}
          {onSale ? <Badge tone="accent">Sale</Badge> : null}
          {tool.recommended ? <Badge tone="soft">Recommended</Badge> : null}
          {tool.editorsPick ? <Badge tone="soft">Editors pick</Badge> : null}
        </div>

        <Link href={detailHref}>
          <h3 className="font-display text-lg font-bold tracking-tight text-text transition hover:text-accent">
            {tool.name}
          </h3>
        </Link>

        <p className="line-clamp-2 text-sm text-muted">{tool.shortDescription}</p>

        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Best for · {tool.bestFor}
        </p>

        {priceLabel ? (
          <p className="text-sm font-semibold text-text">
            {onSale && tool.offer.regularPrice != null ? (
              <>
                <span className="mr-2 text-muted line-through">
                  {formatMoney(tool.offer.regularPrice, tool.pricing.currency)}
                </span>
                {priceLabel}
              </>
            ) : (
              priceLabel
            )}
            {tool.pricing.billingPeriod &&
            tool.pricing.billingPeriod !== "unknown" ? (
              <span className="ml-1 text-xs font-normal text-muted">
                / {tool.pricing.billingPeriod.replace("_", " ")}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Link
            href={detailHref}
            className="flex-1 rounded-full border border-border px-3 py-2 text-center text-sm font-medium text-text transition hover:border-accent/40 hover:text-accent"
          >
            Details
          </Link>
          <Link
            href={goHref}
            className="flex-1 rounded-full bg-accent px-3 py-2 text-center text-sm font-semibold text-white transition hover:opacity-90"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
