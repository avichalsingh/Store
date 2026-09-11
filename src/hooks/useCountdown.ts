"use client";

import { useEffect, useState } from "react";
import type { LaunchOffer } from "@/types";

export type CountdownParts = {
  expired: boolean;
  days: number;
  d: string;
  h: string;
  m: string;
  s: string;
  clock: string;
  compact: string;
  mode: "with-days" | "hms";
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function useCountdown(endDate?: string) {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    if (!endDate) {
      setParts(null);
      return;
    }
    const end = new Date(endDate).getTime();
    if (Number.isNaN(end)) {
      setParts(null);
      return;
    }

    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setParts({
          expired: true,
          days: 0,
          d: "00",
          h: "00",
          m: "00",
          s: "00",
          clock: "00 : 00 : 00",
          compact: "Ended",
          mode: "hms",
        });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      const withDays = days > 0;
      setParts({
        expired: false,
        days,
        d: pad(days),
        h: pad(hours),
        m: pad(mins),
        s: pad(secs),
        clock: withDays
          ? `${pad(days)} : ${pad(hours)} : ${pad(mins)} : ${pad(secs)}`
          : `${pad(hours)} : ${pad(mins)} : ${pad(secs)}`,
        compact: withDays
          ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`
          : `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
        mode: withDays ? "with-days" : "hms",
      });
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endDate]);

  return parts;
}

export function isOfferConfigLive(offer?: LaunchOffer) {
  if (!offer?.enabled) return false;
  if (!offer.endDate) return true;
  return new Date(offer.endDate).getTime() > Date.now();
}
