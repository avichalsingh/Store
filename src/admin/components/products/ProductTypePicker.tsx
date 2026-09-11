"use client";

import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_CONFIG,
  type ProductType,
} from "@/catalog/productTypes";
import {
  Clapperboard,
  ImageIcon,
  Layers,
  MessageSquareText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<
  (typeof PRODUCT_TYPE_CONFIG)[ProductType]["icon"],
  LucideIcon
> = {
  video: Clapperboard,
  image: ImageIcon,
  prompt: Sparkles,
  caption: MessageSquareText,
  bundle: Layers,
};

export function ProductTypePicker({
  onSelect,
}: {
  onSelect: (type: ProductType) => void;
}) {
  return (
    <div>
      <AdminPageHeader
        title="Create product"
        description="Choose a product type to continue. You can set pricing, relationships, and type-specific content next."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_TYPES.map((type) => {
          const config = PRODUCT_TYPE_CONFIG[type];
          const Icon = ICONS[config.icon];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className="text-left transition hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            >
              <AdminCard className="h-full hover:border-[var(--admin-accent)]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold text-[var(--admin-text)]">
                  {config.label}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--admin-muted)]">
                  {config.description}
                </p>
              </AdminCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}
