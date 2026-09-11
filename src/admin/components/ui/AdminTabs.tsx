"use client";

import { cn } from "@/lib/utils";

export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-[var(--admin-surface-2)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === tab.id
              ? "bg-[var(--admin-surface)] text-[var(--admin-text)] shadow-[var(--admin-shadow-sm)]"
              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
