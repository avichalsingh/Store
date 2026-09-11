"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AdminCard({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-sm)]",
        padding && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
