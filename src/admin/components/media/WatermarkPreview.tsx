"use client";

import type { WatermarkConfig, WatermarkSize } from "@/admin/types";
import {
  CONTINUOUS_DIAGONAL_PERIOD_SEC,
  CONTINUOUS_DIAGONAL_WAYPOINTS,
} from "@/admin/lib/watermarkMotion";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sizeMap: Record<WatermarkSize, string> = {
  small: "text-[10px]",
  medium: "text-xs",
  large: "text-sm",
};

function Mark({
  config,
  label,
}: {
  config: WatermarkConfig;
  label: string;
}) {
  const opacity = Math.min(100, Math.max(0, config.opacity)) / 100;
  return (
    <span
      className={cn(
        "select-none font-[family-name:var(--font-syne)] font-semibold tracking-[0.2em] text-white",
        sizeMap[config.size],
      )}
      style={{ opacity }}
    >
      {config.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.imageUrl}
          alt={config.imageName || "Watermark"}
          className={cn(
            "object-contain",
            config.size === "small" && "h-6",
            config.size === "medium" && "h-9",
            config.size === "large" && "h-12",
          )}
        />
      ) : (
        label
      )}
    </span>
  );
}

/**
 * Live Admin watermark preview — motion must match previewEncoder bake path.
 */
export function WatermarkPreview({
  config,
  className,
  label = "RHYTHM",
  variant = "standalone",
}: {
  config: WatermarkConfig;
  className?: string;
  label?: string;
  /** overlay = transparent over a video; standalone = demo panel */
  variant?: "standalone" | "overlay";
}) {
  if (!config.enabled) {
    if (variant === "overlay") return null;
    return (
      <div
        className={cn(
          "relative aspect-[9/16] max-h-72 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950",
          className,
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
          Watermark off
        </div>
      </div>
    );
  }

  const continuous = config.movement === "continuous-diagonal";
  const drift =
    config.movement === "subtle"
      ? { y: [0, -6, 0] as number[] }
      : config.movement === "dynamic"
        ? { y: [0, -10, 0] as number[] }
        : undefined;
  const driftDuration = config.movement === "dynamic" ? 3.5 : 8;

  const continuousLeft = CONTINUOUS_DIAGONAL_WAYPOINTS.map(
    (p) => `${p.x * 100}%`,
  );
  const continuousTop = CONTINUOUS_DIAGONAL_WAYPOINTS.map(
    (p) => `${p.y * 100}%`,
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        variant === "standalone" &&
          "aspect-[9/16] max-h-72 rounded-xl bg-gradient-to-br from-zinc-700 via-zinc-900 to-black",
        variant === "overlay" &&
          "pointer-events-none absolute inset-0 bg-transparent",
        className,
      )}
    >
      {variant === "standalone" ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
      ) : null}

      {continuous ? (
        <motion.div
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2",
            config.style === "diagonal" && "-rotate-[28deg]",
          )}
          animate={{ left: continuousLeft, top: continuousTop }}
          transition={{
            duration: CONTINUOUS_DIAGONAL_PERIOD_SEC,
            repeat: Infinity,
            ease: "easeInOut",
            times: CONTINUOUS_DIAGONAL_WAYPOINTS.map(
              (_, i, arr) => i / (arr.length - 1),
            ),
          }}
        >
          <Mark config={config} label={label} />
        </motion.div>
      ) : null}

      {!continuous && config.style === "diagonal" ? (
        <motion.div
          className="absolute inset-[-40%] grid grid-cols-3 content-center justify-items-center gap-8"
          style={{ rotate: -28 }}
          animate={drift}
          transition={
            drift
              ? {
                  duration: driftDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <Mark key={i} config={config} label={label} />
          ))}
        </motion.div>
      ) : null}

      {!continuous && config.style === "center" ? (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={drift ? { y: drift.y } : undefined}
          transition={
            drift
              ? {
                  duration: driftDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        >
          <Mark config={config} label={label} />
        </motion.div>
      ) : null}

      {!continuous &&
      (config.style === "corner" || config.style === "custom") ? (
        <motion.div
          className="absolute bottom-3 right-3"
          animate={drift ? { y: drift.y } : undefined}
          transition={
            drift
              ? {
                  duration: driftDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        >
          <Mark config={config} label={label} />
        </motion.div>
      ) : null}
    </div>
  );
}
