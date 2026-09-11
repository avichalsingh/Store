"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { CaptionPackView } from "@/components/products/caption-pdp/captionPackView";
import {
  captionItemCount,
  captionRemainingCount,
} from "@/components/products/caption-pdp/captionPackView";
import { CAPTION_PACK_LOCKED_PILL_COUNT } from "@/catalog/contentPackTeaser";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

function CaptionTeaserLine({
  captionLead,
  hasMoreCaption,
  sizeClass,
}: {
  captionLead: string;
  hasMoreCaption: boolean;
  sizeClass: string;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-end gap-x-1.5 gap-y-1">
      <p
        className={cn(
          "max-w-full font-display font-bold leading-[1.2] tracking-tight text-text",
          sizeClass,
        )}
        aria-label="Partial caption preview"
      >
        {captionLead}
        {hasMoreCaption ? <span className="text-text/45">…</span> : null}
      </p>
      {hasMoreCaption ? (
        <span
          className="inline-flex items-center gap-1.5 select-none"
          aria-hidden
        >
          <span className="inline-block h-[1.05em] w-14 rounded-sm bg-gradient-to-r from-text/30 via-text/12 to-transparent blur-[2.5px] sm:w-20" />
          <span className="inline-block h-[1.05em] w-10 rounded-sm bg-text/15 blur-[4px] sm:w-14" />
          <Lock size={11} className="shrink-0 text-muted/55" strokeWidth={2.4} />
        </span>
      ) : null}
    </div>
  );
}

function HashtagTeaserRow({
  visibleHashtag,
  hasMoreHashtags,
}: {
  visibleHashtag?: string;
  hasMoreHashtags: boolean;
}) {
  if (!visibleHashtag && !hasMoreHashtags) {
    return null;
  }

  const lockedPills = hasMoreHashtags ? CAPTION_PACK_LOCKED_PILL_COUNT : 0;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {visibleHashtag ? (
        <span className="inline-flex rounded-full border border-accent/40 bg-accent/12 px-3 py-1.5 font-display text-sm font-bold tracking-tight text-accent">
          {visibleHashtag}
        </span>
      ) : null}
      {Array.from({ length: lockedPills }).map((_, pillIndex) => (
        <span
          key={pillIndex}
          className="relative inline-flex h-[34px] min-w-[3.25rem] items-center justify-center rounded-full border border-border/50 bg-surface-2/80 px-3 py-1.5 select-none"
          aria-hidden
        >
          <span className="h-2 w-10 rounded-full bg-text/20 blur-[5px]" />
          <Lock
            size={9}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted/40"
            strokeWidth={2.5}
          />
        </span>
      ))}
    </div>
  );
}

export function CaptionPreviewStage({
  product,
}: {
  product: CaptionPackView;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLElement>({ threshold: 0.12 });
  const previews = product.previewItems ?? [];
  const remaining = captionRemainingCount(product);
  const reveal = inView || reduced;
  const itemCount = captionItemCount(product);
  const itemLabel = "caption + hashtag combo";

  return (
    <section
      ref={ref}
      aria-labelledby="caption-preview-heading"
      className="relative"
    >
      <div className="rounded-2xl border border-border/70 bg-surface/50 px-5 py-6 sm:px-6 sm:py-7">
        <header className="border-b border-border/50 pb-5">
          <h2
            id="caption-preview-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
          >
            Taste the pack
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {previews.length} preview{previews.length === 1 ? "" : "s"} ·{" "}
            {itemCount} {itemLabel}
            {itemCount === 1 ? "" : "s"} inside
          </p>
        </header>

        <div className="mt-6">
          {previews.map((item, index) => (
            <motion.article
              key={`preview-${index}`}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{
                duration: reduced ? 0 : 0.45,
                delay: reduced ? 0 : index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "py-5",
                index < previews.length - 1 && "border-b border-border/45",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/90">
                {String(index + 1).padStart(2, "0")}
              </p>
              <CaptionTeaserLine
                captionLead={item.captionLead}
                hasMoreCaption={item.hasMoreCaption}
                sizeClass={cn(
                  index === 0 && "text-2xl sm:text-[1.85rem]",
                  index === 1 && "text-xl sm:text-2xl",
                  index >= 2 && "text-lg sm:text-xl",
                )}
              />
              <HashtagTeaserRow
                visibleHashtag={item.visibleHashtag}
                hasMoreHashtags={item.hasMoreHashtags}
              />
            </motion.article>
          ))}
        </div>
      </div>

      {remaining > 0 ? (
        <>
          <div
            className="my-8 flex items-center gap-3 sm:gap-4"
            role="separator"
            aria-label="Preview ends here"
          >
            <div className="h-px flex-1 bg-border" aria-hidden />
            <p className="flex shrink-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text">
              <Lock size={13} className="text-accent" aria-hidden />
              <span>
                Unlock {remaining} complete {itemLabel}
                {remaining === 1 ? "" : "s"}
              </span>
            </p>
            <div className="h-px flex-1 bg-border" aria-hidden />
          </div>

          <div
            className="relative overflow-hidden rounded-xl border border-dashed border-border/55 bg-surface-2/40 px-5 py-4 sm:px-6"
            aria-hidden
          >
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "border-b border-border/30 pb-4 last:border-0",
                    i === 0 && "opacity-55",
                    i === 1 && "opacity-40",
                    i === 2 && "opacity-25",
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted/60">
                    {String(previews.length + i + 1).padStart(2, "0")}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="inline-block h-5 w-24 rounded-sm bg-text/12 blur-[3px]" />
                    <span className="inline-block h-5 w-16 rounded-sm bg-text/10 blur-[4px]" />
                    <Lock size={10} className="text-muted/45" />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, pillIndex) => (
                      <span
                        key={pillIndex}
                        className="inline-flex h-7 min-w-[3rem] items-center justify-center rounded-full border border-border/35 bg-surface px-2.5"
                      >
                        <span className="h-1.5 w-8 rounded-full bg-text/15 blur-[4px]" />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-2 to-transparent"
              aria-hidden
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
