"use client";

import { CollageLayoutPreview } from "@/admin/components/collections/CollageCover";
import type { CollectionCollageLayout } from "@/admin/types";
import { cn } from "@/lib/utils";

const LAYOUTS: { id: CollectionCollageLayout; label: string }[] = [
  { id: "single", label: "Single" },
  { id: "two-horizontal", label: "2 horizontal" },
  { id: "two-vertical", label: "2 vertical" },
  { id: "three-horizontal", label: "3 horizontal" },
  { id: "three-vertical", label: "3 vertical" },
  { id: "three-large-left", label: "3 large left" },
  { id: "three-large-right", label: "3 large right" },
  { id: "four-grid", label: "4 grid" },
  { id: "four-horizontal", label: "4 horizontal" },
  { id: "four-vertical", label: "4 vertical" },
];

export function CollageLayoutPicker({
  value,
  onChange,
}: {
  value: CollectionCollageLayout;
  onChange: (layout: CollectionCollageLayout) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {LAYOUTS.map((layout) => {
        const active = value === layout.id;
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChange(layout.id)}
            className={cn(
              "rounded-xl border p-2 text-left transition",
              active
                ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]"
                : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40",
            )}
          >
            <CollageLayoutPreview layout={layout.id} active={active} />
            <p className="mt-1.5 text-[10px] font-medium text-[var(--admin-muted)]">
              {layout.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}
