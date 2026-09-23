"use client";

import { cn } from "@/lib/utils";

/** Splits badges like "🔥 TRENDING FORMAT" so only the emoji animates. */
export function TrendingBadgeLabel({
  badge,
  className,
  textClassName,
}: {
  badge: string | null | undefined;
  className?: string;
  textClassName?: string;
}) {
  const safeBadge = typeof badge === "string" ? badge : "";
  const match = safeBadge.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
  const emoji = match?.[1] ?? null;
  const text = match?.[2] ?? safeBadge;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {emoji && (
        <span className="inline-block origin-bottom animate-fire-flicker" aria-hidden>
          {emoji}
        </span>
      )}
      <span className={textClassName}>{text || safeBadge}</span>
    </span>
  );
}
