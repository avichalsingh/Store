"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Region } from "@/types";
import {
  detectRegion,
  detectRegionFromLocation,
  REGION_STORAGE_KEY,
} from "@/lib/pricing";

type RegionContextValue = {
  region: Region;
  ready: boolean;
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState<Region>("international");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Drop any previous manual toggle preference — pricing is location-based only.
    try {
      localStorage.removeItem(REGION_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    const initial = detectRegion();
    setRegion(initial);
    setReady(true);

    let cancelled = false;
    void detectRegionFromLocation().then((detected) => {
      if (!cancelled) setRegion(detected);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ region, ready }), [region, ready]);

  return (
    <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used within RegionProvider");
  return ctx;
}
