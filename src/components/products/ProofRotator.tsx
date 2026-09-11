"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { SocialProofRotation } from "@/types";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";

export function ProofRotator({
  rotation,
}: {
  rotation: SocialProofRotation;
}) {
  const [index, setIndex] = useState(0);
  const messages = rotation.messages;
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (messages.length < 2 || reduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      4500
    );
    return () => window.clearInterval(id);
  }, [messages.length, reduced]);

  if (!messages.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-2 px-4 py-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        Demo activity snapshot
      </p>
      <div className="relative h-7">
        <AnimatePresence mode="wait">
          <motion.p
            key={messages[index]}
            initial={reduced ? false : { y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: -14, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 text-sm font-medium text-text"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
