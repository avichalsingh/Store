"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

export function AnimatedDigit({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <span className={cn("inline-block tabular-nums", className)}>{value}</span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex h-[1.1em] min-w-[0.65em] items-center justify-center overflow-hidden tabular-nums",
        className
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "75%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-75%", opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function AnimatedClockUnit({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex", className)}>
      {value.split("").map((digit, i) => (
        <AnimatedDigit key={i} value={digit} />
      ))}
    </span>
  );
}
