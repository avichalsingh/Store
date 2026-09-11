"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";

const DEFAULT_MICRO = [
  "⏳ Before the launch price changes",
  "🔥 Already getting creator attention",
  "⚡ Instant access after purchase",
  "↗ Get in before the trend gets familiar",
];

type TrendCtaProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  microcopy?: string | false;
  rotateMicro?: boolean;
  microMessages?: string[];
  variant?: "primary" | "soft";
  type?: "button" | "submit";
};

export function TrendCta({
  children,
  onClick,
  className,
  microcopy,
  rotateMicro = false,
  microMessages = DEFAULT_MICRO,
  variant = "primary",
  type = "button",
}: TrendCtaProps) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const messages =
    rotateMicro && microcopy !== false
      ? microMessages
      : typeof microcopy === "string"
        ? [microcopy]
        : [];

  useEffect(() => {
    if (!rotateMicro || messages.length < 2 || reduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      4500
    );
    return () => window.clearInterval(id);
  }, [rotateMicro, messages.length, reduced]);

  const isSoft = variant === "soft";

  return (
    <div className="space-y-2">
      <button
        type={type}
        onClick={onClick}
        className={cn(
          "relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.985]",
          !reduced &&
            isSoft &&
            "cta-soft group/cta shadow-[0_0_22px_rgba(255,92,138,0.25)]",
          !reduced &&
            !isSoft &&
            "cta-primary cta-soft shadow-[0_0_24px_rgba(255,92,138,0.28)]",
          reduced && "shadow-[0_0_24px_rgba(255,92,138,0.28)]",
          className
        )}
      >
        <Zap
          size={16}
          className={cn("relative z-[1]", !reduced && isSoft && "animate-arrow-nudge")}
        />
        <span className="relative z-[1] inline-flex items-center gap-1">
          {typeof children === "string" && children.includes("→") ? (
            <>
              {children.replace(/\s*→\s*$/, "")}
              <span
                className={cn(
                  "inline-block transition-transform duration-300",
                  !reduced && "group-hover/cta:translate-x-1.5 animate-arrow-nudge"
                )}
              >
                →
              </span>
            </>
          ) : (
            children
          )}
        </span>
      </button>
      {messages.length > 0 && (
        <div className="relative h-5 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messages[index] ?? messages[0]}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 text-xs text-muted"
            >
              {messages[index] ?? messages[0]}
            </motion.p>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
