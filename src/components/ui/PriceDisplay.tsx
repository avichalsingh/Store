"use client";

import { formatPrice } from "@/lib/pricing";
import { useRegion } from "@/context/RegionContext";
import { cn } from "@/lib/utils";
import type { Region } from "@/types";

type PriceDisplayProps = {
  price: number;
  originalPrice?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  region?: Region;
};

export function PriceDisplay({
  price,
  originalPrice,
  size = "md",
  className,
  region,
}: PriceDisplayProps) {
  const { region: ctxRegion, ready } = useRegion();
  const r = region ?? ctxRegion;

  if (!ready) {
    return (
      <span
        className={cn(
          "inline-block animate-pulse rounded bg-surface-2",
          size === "xl" ? "h-10 w-28" : "h-5 w-16",
          className
        )}
      />
    );
  }

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums text-text",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-2xl",
          size === "xl" && "font-display text-4xl font-bold sm:text-5xl"
        )}
      >
        {formatPrice(price, r)}
      </span>
      {originalPrice != null && originalPrice > price && (
        <span
          className={cn(
            "text-muted line-through tabular-nums",
            size === "xl" || size === "lg" ? "text-sm" : "text-xs"
          )}
        >
          {formatPrice(originalPrice, r)}
        </span>
      )}
    </div>
  );
}
