"use client";

import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export function useInViewOnce<T extends HTMLElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const inViewRef = useRef(false);
  // Keep latest options without putting the object identity in effect deps.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || inViewRef.current) return;

    const opts = optionsRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          inViewRef.current = true;
          setInView(true);
          io.disconnect();
        }
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -8% 0px",
        ...opts,
      },
    );
    io.observe(el);

    const fallback = window.setTimeout(() => {
      if (inViewRef.current) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        inViewRef.current = true;
        setInView(true);
      }
    }, 350);

    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
    // Intentionally empty: observe once per mount. Options read from ref.
  }, []);

  return { ref, inView };
}
