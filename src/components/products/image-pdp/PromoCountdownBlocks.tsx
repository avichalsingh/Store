"use client";

import type { CountdownParts } from "@/hooks/useCountdown";
import type { IntroTimerPhase } from "@/hooks/useIntroPriceTimer";
import { AnimatedClockUnit } from "@/components/motion/AnimatedDigit";
import { cn } from "@/lib/utils";

function CountdownChip({
  value,
  label,
  urgent,
}: {
  value: string;
  label: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[4.5rem] flex-col items-center rounded-xl border px-2.5 py-2 tabular-nums",
        urgent
          ? "border-amber-400/50 bg-amber-50/80 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
          : "border-accent/30 bg-accent/[0.06]",
      )}
    >
      <span
        className={cn(
          "font-display text-xl font-bold sm:text-2xl",
          urgent ? "text-amber-700" : "text-text",
        )}
      >
        <AnimatedClockUnit value={value} />
      </span>
      <span
        className={cn(
          "mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
          urgent ? "text-amber-600/90" : "text-muted",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function PromoCountdownBlocks({
  countdown,
  phase,
  reduced,
}: {
  countdown: CountdownParts;
  phase: IntroTimerPhase;
  reduced?: boolean;
}) {
  const isExtension = phase === "extension";
  const showDays = !isExtension && countdown.days > 0;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        isExtension
          ? "border-amber-400/40 bg-gradient-to-br from-amber-50/90 to-accent/[0.04]"
          : "border-accent/25 bg-gradient-to-br from-accent/[0.07] to-surface",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.16em]",
          isExtension ? "text-amber-700" : "text-accent",
        )}
      >
        {isExtension ? "⚠ FINAL EXTENSION" : "🔥 PRICE GOES UP IN"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {showDays ? (
          <CountdownChip value={countdown.d} label="Days" urgent={isExtension} />
        ) : (
          <CountdownChip value="00" label="Days" urgent={isExtension} />
        )}
        <CountdownChip value={countdown.h} label="Hrs" urgent={isExtension} />
        <CountdownChip value={countdown.m} label="Min" urgent={isExtension} />
      </div>

      {!reduced && !isExtension ? (
        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-border">
          <span className="block h-full w-2/3 animate-arrow-nudge rounded-full bg-accent/60" />
        </div>
      ) : null}

      <p className="mt-3 text-xs font-medium leading-relaxed text-muted">
        {isExtension
          ? "Final few hours before the price increases."
          : "Grab it before the price goes back up."}
      </p>
    </div>
  );
}
