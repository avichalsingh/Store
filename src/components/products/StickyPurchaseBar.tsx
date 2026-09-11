"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoProduct } from "@/types";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { getVideoQuote, formatPrice } from "@/lib/pricing";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

export function StickyPurchaseBar({
  video,
  targetId,
}: {
  video: VideoProduct;
  targetId: string;
}) {
  const [visible, setVisible] = useState(false);
  const [nearCheckout, setNearCheckout] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const { region, ready } = useRegion();
  const { addVideo, items, isOpen } = useCart();
  const router = useRouter();
  const quote = getVideoQuote(video, region);
  const reduced = usePrefersReducedMotion();
  const savings = Math.max(0, quote.regular - quote.current);

  const likes = video.performance?.secondaryMetrics.find((m) =>
    /like/i.test(m.label),
  );
  const shares = video.performance?.secondaryMetrics.find((m) =>
    /share/i.test(m.label),
  );

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
        setNearCheckout(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  useEffect(() => {
    if (!visible || nearCheckout || reduced || !quote.saleActive) return;
    const tick = () => {
      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 900);
    };
    const id = window.setInterval(tick, 9000);
    return () => window.clearInterval(id);
  }, [visible, nearCheckout, reduced, quote.saleActive]);

  if (!visible || isOpen) return null;

  const buy = () => {
    if (!items.some((i) => i.productId === video.id)) {
      addVideo(video, { open: false });
    }
    router.push("/checkout");
  };

  const calm = nearCheckout;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-4 py-3 shadow-[0_-12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl animate-slide-up">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 truncate text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
              {!reduced && !calm ? (
                <span className="absolute inline-flex h-full w-full animate-live-ring rounded-full bg-emerald-400/45" />
              ) : null}
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400",
                  !calm && "animate-live-dot",
                )}
              />
            </span>
            🔥 TRENDING RIGHT NOW
          </p>
          <p className="hidden truncate text-sm text-text-dim sm:block">
            {video.performance
              ? `${video.performance.primaryMetric} plays · ${shares?.value ?? likes?.value ?? "—"} shares`
              : video.title}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            {quote.saleActive && ready ? (
              <p className="text-[11px] text-muted line-through tabular-nums">
                {formatPrice(quote.regular, region)}
              </p>
            ) : null}
            <p className="text-sm font-bold tabular-nums text-text">
              {ready ? formatPrice(quote.current, region) : "—"}
            </p>
            {quote.saleActive && ready && savings > 0 ? (
              <p
                className={cn(
                  "hidden text-[11px] font-medium text-accent sm:block transition",
                  saveFlash && !calm && "animate-activity-nudge",
                )}
              >
                Save {formatPrice(savings, region)} today
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={buy}
            className={cn(
              "relative inline-flex items-center gap-1 overflow-hidden rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(255,92,138,0.22)] transition hover:brightness-110",
              !calm && "cta-heartbeat",
            )}
          >
            <span className={cn(!calm && "animate-lightning")} aria-hidden>
              ⚡
            </span>
            GET THIS TREND
          </button>
        </div>
      </div>
    </div>
  );
}
