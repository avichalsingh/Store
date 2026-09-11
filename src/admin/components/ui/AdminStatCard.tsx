"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminStatCard({
  label,
  value,
  change,
  icon: Icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  change?: number;
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-[var(--admin-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
            {label}
          </p>
          <p className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-semibold text-[var(--admin-text)]">
            {value}
          </p>
        </div>
        {Icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--admin-surface-2)] text-[var(--admin-muted)]">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      {(change !== undefined || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {change !== undefined ? (
            <span
              className={cn(
                "font-medium",
                change >= 0 ? "text-[var(--admin-success)]" : "text-[var(--admin-danger)]",
              )}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          ) : null}
          {hint ? <span className="text-[var(--admin-muted)]">{hint}</span> : null}
        </div>
      )}
    </div>
  );
}
