"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";

function formatDisplay(value: number, template: string) {
  if (template.includes("M")) {
    const n = value / 1_000_000;
    const digits = n >= 10 ? 0 : 1;
    return `${n.toFixed(digits)}M${template.includes("+") ? "+" : ""}`;
  }
  if (template.includes("K")) {
    const n = value / 1000;
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.05) {
      return `${Math.round(n)}K`;
    }
    return `${n.toFixed(1)}K`;
  }
  if (template.includes("%")) return `${Math.round(value)}%`;
  if (template.includes("×") || template.includes("x")) {
    return `${value.toFixed(1)}×`;
  }
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (Math.abs(value - Math.round(value)) > 0.05) return value.toFixed(1);
  return String(Math.round(value));
}

/**
 * Animates a numeric metric into its display template once.
 * Display text is the only React state updated by rAF — never fed back into effect deps.
 */
export function CountUp({
  to,
  template,
  duration = 1200,
  delay = 0,
  overshoot = false,
  className,
}: {
  to: number;
  template: string;
  duration?: number;
  delay?: number;
  overshoot?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => formatDisplay(0, template));
  const reduced = usePrefersReducedMotion();
  const frameRef = useRef(0);
  const runIdRef = useRef(0);

  useEffect(() => {
    const runId = ++runIdRef.current;
    cancelAnimationFrame(frameRef.current);

    const target = Number.isFinite(to) ? to : 0;

    if (reduced) {
      setDisplay(template);
      return;
    }

    let startAt = 0;

    const tick = (now: number) => {
      // Ignore frames from a cancelled / superseded animation run.
      if (runId !== runIdRef.current) return;

      if (!startAt) startAt = now + delay;
      if (now < startAt) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(1, (now - startAt) / Math.max(1, duration));
      let eased = 1 - Math.pow(1 - t, 3);

      if (overshoot && t > 0.82) {
        const o = (t - 0.82) / 0.18;
        const bump = Math.sin(o * Math.PI) * 0.035;
        eased = Math.min(1.04, eased + bump);
      }

      if (t >= 1) {
        setDisplay(template);
        return;
      }

      setDisplay(
        formatDisplay(
          target * Math.min(eased, overshoot ? 1.04 : 1),
          template,
        ),
      );
      frameRef.current = requestAnimationFrame(tick);
    };

    setDisplay(formatDisplay(0, template));
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      runIdRef.current += 1;
      cancelAnimationFrame(frameRef.current);
    };
  }, [to, template, duration, delay, overshoot, reduced]);

  return <span className={className}>{display}</span>;
}
