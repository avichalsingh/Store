"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";

const COLORS = ["#ff8fab", "#d65a7b", "#f2c4a0", "#e8c547"];

type Particle = {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  drift: number;
  rotate: number;
  tall: boolean;
};

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 8 + Math.random() * 84,
    delay: Math.random() * 0.35,
    duration: 1.6 + Math.random() * 0.9,
    size: 3 + Math.random() * 4,
    color: COLORS[i % COLORS.length],
    drift: (Math.random() - 0.5) * 48,
    rotate: (Math.random() - 0.5) * 140,
    tall: Math.random() > 0.45,
  }));
}

/** One-shot soft confetti on PDP open — never loops. */
export function SoftPdpConfetti() {
  const reduced = usePrefersReducedMotion();
  const [particles, setParticles] = useState<Particle[] | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (reduced) return;
    setParticles(makeParticles(18));
    const t = window.setTimeout(() => setGone(true), 2800);
    return () => window.clearTimeout(t);
  }, [reduced]);

  if (reduced || gone || !particles) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              opacity: 0,
              x: `${p.x}vw`,
              y: "-4vh",
              rotate: 0,
              scale: 0.6,
            }}
            animate={{
              opacity: [0, 0.85, 0.85, 0],
              x: `calc(${p.x}vw + ${p.drift}px)`,
              y: "42vh",
              rotate: p.rotate,
              scale: 1,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="absolute top-0 left-0 block rounded-[1px]"
            style={{
              width: p.size,
              height: p.tall ? p.size * 1.35 : p.size * 0.7,
              backgroundColor: p.color,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
