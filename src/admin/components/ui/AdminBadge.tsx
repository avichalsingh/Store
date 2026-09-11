"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AdminBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[var(--admin-surface-2)] text-[var(--admin-muted)]",
    accent: "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]",
    success: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
    warning: "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]",
    danger: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
    info: "bg-[var(--admin-info-soft)] text-[var(--admin-info)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const map: Record<string, { tone: Parameters<typeof AdminBadge>[0]["tone"]; label: string }> = {
    active: { tone: "success", label: "Active" },
    draft: { tone: "neutral", label: "Draft" },
    inactive: { tone: "warning", label: "Inactive" },
    hidden: { tone: "neutral", label: "Hidden" },
    archived: { tone: "warning", label: "Archived" },
    scheduled: { tone: "info", label: "Scheduled" },
    ended: { tone: "neutral", label: "Ended" },
    upcoming: { tone: "info", label: "Upcoming" },
    expired: { tone: "danger", label: "Expired" },
    paid: { tone: "success", label: "Paid" },
    pending: { tone: "warning", label: "Pending" },
    refunded: { tone: "danger", label: "Refunded" },
    completed: { tone: "success", label: "Completed" },
    processing: { tone: "info", label: "Processing" },
    cancelled: { tone: "danger", label: "Cancelled" },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status };
  return <AdminBadge tone={entry.tone}>{entry.label}</AdminBadge>;
}
