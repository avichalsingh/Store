"use client";

import type { MediaProcessingSteps } from "@/admin/types";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

type Step = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

function buildSteps(
  steps: MediaProcessingSteps,
  ready: boolean,
  kind: "video" | "image",
): Step[] {
  if (kind === "image") {
    if (ready) {
      return [
        { id: "master", label: "Master image uploaded", done: true, active: false },
        {
          id: "preview",
          label: "Optimized preview generated",
          done: true,
          active: false,
        },
        {
          id: "watermark",
          label: "Watermark applied",
          done: true,
          active: false,
        },
        {
          id: "save",
          label: "Preview saved",
          done: true,
          active: false,
        },
      ];
    }

    const previewDone = steps.previewReady;
    const watermarkDone = steps.watermarkReady;
    // Indeterminate pipeline: only one step is active at a time.
    const generating =
      steps.previewGenerating && !previewDone && !watermarkDone;
    const watermarking =
      (steps.watermarkApplying || (previewDone && !watermarkDone)) &&
      !watermarkDone &&
      !generating;
    const saving =
      previewDone &&
      watermarkDone &&
      !steps.thumbnailReady &&
      !generating &&
      !watermarking;

    return [
      {
        id: "upload",
        label: "Master image uploaded",
        done: steps.uploadComplete,
        active: false,
      },
      {
        id: "preview",
        label: "Generating optimized preview…",
        done: previewDone || watermarkDone,
        active: generating,
      },
      {
        id: "watermark",
        label: "Applying watermark",
        done: watermarkDone,
        active: watermarking,
      },
      {
        id: "save",
        label: "Saving preview",
        done: steps.thumbnailReady && previewDone,
        active: saving || (previewDone && watermarkDone && !steps.thumbnailReady),
      },
    ];
  }

  if (ready) {
    return [
      { id: "master", label: "Master video ready", done: true, active: false },
      { id: "preview", label: "Preview generated", done: true, active: false },
      { id: "watermark", label: "Watermark applied", done: true, active: false },
      {
        id: "thumb",
        label: "Thumbnail frames available",
        done: true,
        active: false,
      },
    ];
  }

  return [
    {
      id: "upload",
      label: "Original upload complete",
      done: steps.uploadComplete,
      active: false,
    },
    {
      id: "preview",
      label: "Generating preview",
      done: steps.previewReady,
      active: steps.previewGenerating && !steps.previewReady,
    },
    {
      id: "watermark",
      label: "Applying watermark",
      done: steps.watermarkReady,
      active: steps.watermarkApplying && !steps.watermarkReady,
    },
    {
      id: "thumb",
      label: "Preparing thumbnail frames",
      done: steps.thumbnailReady,
      active: steps.thumbnailExtracting && !steps.thumbnailReady,
    },
  ];
}

export function ProcessingStepsList({
  steps,
  status,
  className,
  kind = "video",
}: {
  steps: MediaProcessingSteps;
  status: string;
  className?: string;
  /** Use image-oriented labels and indeterminate progress (no fake %). */
  kind?: "video" | "image";
}) {
  const ready = status === "ready";
  const failed = status === "failed";
  const items = buildSteps(steps, ready, kind);
  const activeLabel = items.find((i) => i.active && !i.done)?.label;

  return (
    <div className={cn("space-y-3", className)}>
      <ul className="space-y-2.5">
        {items.map((step) => (
          <li key={step.id} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                step.done &&
                  "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
                step.active &&
                  !step.done &&
                  "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]",
                !step.done &&
                  !step.active &&
                  "border border-[var(--admin-border)] text-[var(--admin-muted)]",
              )}
            >
              {step.done ? (
                <Check className="h-3 w-3" />
              ) : step.active ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
              )}
            </span>
            <span
              className={cn(
                step.done || step.active
                  ? "text-[var(--admin-text)]"
                  : "text-[var(--admin-muted)]",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
      {!ready && !failed ? (
        <div className="space-y-1.5">
          {kind === "image" ? (
            <div className="h-1 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--admin-accent)]" />
            </div>
          ) : (
            <div className="h-1 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
              <div
                className="h-full animate-pulse rounded-full bg-[var(--admin-accent)] transition-all duration-700"
                style={{
                  width: `${Math.min(
                    95,
                    (items.filter((i) => i.done).length / items.length) * 100 +
                      (items.some((i) => i.active) ? 12 : 0),
                  )}%`,
                }}
              />
            </div>
          )}
          <p className="text-[11px] text-[var(--admin-muted)]">
            {activeLabel
              ? activeLabel
              : "Processing may take a few moments."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
