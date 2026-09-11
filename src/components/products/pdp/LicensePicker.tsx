"use client";

import { cn } from "@/lib/utils";

export type LicenseId = "standard" | "commercial";

const OPTIONS: Array<{
  id: LicenseId;
  title: string;
  description: string;
}> = [
  {
    id: "standard",
    title: "Standard — Personal & social use",
    description: "Use it in your personal or social content.",
  },
  {
    id: "commercial",
    title: "Commercial — Brand & client work",
    description: "For brand and client projects (added at checkout later).",
  },
];

export function LicensePicker({
  value,
  onChange,
}: {
  value: LicenseId;
  onChange: (id: LicenseId) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        Choose your license
      </h2>
      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "w-full rounded-2xl border px-4 py-3.5 text-left transition duration-200",
                selected
                  ? "border-accent/50 bg-accent/5 shadow-[0_0_0_1px_rgba(255,92,138,0.18)]"
                  : "border-border bg-surface hover:border-accent/30",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
                    selected
                      ? "border-accent bg-accent"
                      : "border-border bg-transparent",
                  )}
                  aria-hidden
                >
                  {selected ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{opt.title}</p>
                  <p className="mt-1 text-xs text-muted">{opt.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
