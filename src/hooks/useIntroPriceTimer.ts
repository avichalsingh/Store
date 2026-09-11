"use client";

import { useEffect, useMemo, useState } from "react";
import { useCountdown, type CountdownParts } from "@/hooks/useCountdown";

const STORAGE_PREFIX = "rhythm-intro-timer:";
const EXTENSION_SUFFIX = ":extension";

export type IntroTimerPhase = "primary" | "extension" | "ended";

/**
 * Visitor-scoped intro-price window with optional multi-day primary phase
 * and a short extension phase after the primary countdown ends.
 */
export function useIntroPriceTimer(
  productId: string,
  opts: {
    /** When false, no timer is created. */
    enabled: boolean;
    /** Preferred CMS end date — used when still in the future. */
    cmsEndDate?: string;
    /** Primary window length in days (default 20). */
    days?: number;
    /** Extension window after primary expires (default 4 hours). */
    extensionHours?: number;
    /** Legacy fallback window in minutes when days is not set. */
    minutes?: number;
  },
) {
  const days = opts.days ?? 20;
  const extensionHours = opts.extensionHours ?? 4;
  const minutes = opts.minutes ?? 12;
  const useDays = opts.days != null || opts.cmsEndDate;

  const [primaryEndDate, setPrimaryEndDate] = useState<string | undefined>(
    undefined,
  );
  const [extensionEndDate, setExtensionEndDate] = useState<
    string | undefined
  >(undefined);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!opts.enabled || !productId) {
      setPrimaryEndDate(undefined);
      setExtensionEndDate(undefined);
      setHydrated(true);
      return;
    }

    const primaryKey = `${STORAGE_PREFIX}${productId}`;
    const extensionKey = `${STORAGE_PREFIX}${productId}${EXTENSION_SUFFIX}`;

    try {
      const cms = opts.cmsEndDate ? new Date(opts.cmsEndDate).getTime() : NaN;
      let primaryIso: string;

      if (!Number.isNaN(cms) && cms > Date.now()) {
        primaryIso = new Date(cms).toISOString();
      } else {
        const existing = window.localStorage.getItem(primaryKey);
        if (existing) {
          const parsed = new Date(existing).getTime();
          if (!Number.isNaN(parsed)) {
            primaryIso = new Date(parsed).toISOString();
          } else {
            primaryIso = new Date(
              Date.now() +
                (useDays ? days * 24 * 60 * 60 * 1000 : minutes * 60 * 1000),
            ).toISOString();
            window.localStorage.setItem(primaryKey, primaryIso);
          }
        } else {
          primaryIso = new Date(
            Date.now() +
              (useDays ? days * 24 * 60 * 60 * 1000 : minutes * 60 * 1000),
          ).toISOString();
          window.localStorage.setItem(primaryKey, primaryIso);
        }
      }

      setPrimaryEndDate(primaryIso);

      const primaryEnd = new Date(primaryIso).getTime();
      const now = Date.now();

      if (primaryEnd <= now) {
        const existingExt = window.localStorage.getItem(extensionKey);
        if (existingExt) {
          const extParsed = new Date(existingExt).getTime();
          if (!Number.isNaN(extParsed)) {
            setExtensionEndDate(new Date(extParsed).toISOString());
          }
        } else {
          const extIso = new Date(
            primaryEnd + extensionHours * 60 * 60 * 1000,
          ).toISOString();
          window.localStorage.setItem(extensionKey, extIso);
          setExtensionEndDate(extIso);
        }
      } else {
        const existingExt = window.localStorage.getItem(extensionKey);
        if (existingExt) {
          const extParsed = new Date(existingExt).getTime();
          if (!Number.isNaN(extParsed)) {
            setExtensionEndDate(new Date(extParsed).toISOString());
          }
        }
      }
    } catch {
      setPrimaryEndDate(
        new Date(
          Date.now() +
            (useDays ? days * 24 * 60 * 60 * 1000 : minutes * 60 * 1000),
        ).toISOString(),
      );
    }

    setHydrated(true);
  }, [
    opts.enabled,
    opts.cmsEndDate,
    productId,
    days,
    extensionHours,
    minutes,
    useDays,
  ]);

  const primaryCountdown = useCountdown(
    opts.enabled ? primaryEndDate : undefined,
  );
  const extensionCountdown = useCountdown(
    opts.enabled ? extensionEndDate : undefined,
  );

  useEffect(() => {
    if (!opts.enabled || !productId || !primaryEndDate || extensionEndDate) return;
    const primaryEnd = new Date(primaryEndDate).getTime();
    if (primaryEnd > Date.now()) return;

    const extensionKey = `${STORAGE_PREFIX}${productId}${EXTENSION_SUFFIX}`;
    try {
      const existingExt = window.localStorage.getItem(extensionKey);
      if (existingExt) {
        setExtensionEndDate(new Date(existingExt).toISOString());
        return;
      }
      const extIso = new Date(
        primaryEnd + extensionHours * 60 * 60 * 1000,
      ).toISOString();
      window.localStorage.setItem(extensionKey, extIso);
      setExtensionEndDate(extIso);
    } catch {
      /* ignore */
    }
  }, [
    opts.enabled,
    productId,
    primaryEndDate,
    extensionEndDate,
    extensionHours,
    primaryCountdown?.expired,
  ]);

  const phase: IntroTimerPhase = useMemo(() => {
    if (!opts.enabled || !hydrated) return "ended";
    if (!primaryEndDate) return "ended";

    const primaryExpired =
      primaryCountdown?.expired ||
      new Date(primaryEndDate).getTime() <= Date.now();

    if (!primaryExpired) return "primary";

    if (extensionEndDate) {
      const extExpired =
        extensionCountdown?.expired ||
        new Date(extensionEndDate).getTime() <= Date.now();
      return extExpired ? "ended" : "extension";
    }

    return "ended";
  }, [
    opts.enabled,
    hydrated,
    primaryEndDate,
    extensionEndDate,
    primaryCountdown?.expired,
    extensionCountdown?.expired,
  ]);

  const countdown: CountdownParts | null = useMemo(() => {
    if (phase === "primary") return primaryCountdown;
    if (phase === "extension") return extensionCountdown;
    return null;
  }, [phase, primaryCountdown, extensionCountdown]);

  const expired = phase === "ended";

  /** Offer stays live during primary and extension phases. */
  const offerActive = opts.enabled && (phase === "primary" || phase === "extension");

  return {
    endDate: phase === "extension" ? extensionEndDate : primaryEndDate,
    hydrated,
    expired,
    phase,
    offerActive,
    countdown,
  };
}
