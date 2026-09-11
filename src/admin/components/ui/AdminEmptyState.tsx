"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-16 text-center">
      {Icon ? (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--admin-surface-2)] text-[var(--admin-muted)]">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-[var(--admin-text)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[var(--admin-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
