"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { uid } from "@/admin/lib/format";
import type {
  ImagePdpGlobalSettings,
  ImagePdpPricingTier,
} from "@/catalog/imagePdpTypes";
import { Plus, Trash2 } from "lucide-react";

export function ImagePdpSettingsPanel({
  settings,
  onChange,
  onSave,
}: {
  settings: ImagePdpGlobalSettings;
  onChange: (next: ImagePdpGlobalSettings) => void;
  onSave: () => void;
}) {
  const tiers = settings.pricingTiers ?? [];
  const deal = settings.dealDefaults ?? {};

  const setTier = (index: number, patch: Partial<ImagePdpPricingTier>) => {
    const next = tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange({ ...settings, pricingTiers: next });
  };

  const addTier = () => {
    const lastMin = tiers.length
      ? Math.max(...tiers.map((t) => t.minQuantity)) + 1
      : 1;
    onChange({
      ...settings,
      pricingTiers: [
        ...tiers,
        { minQuantity: lastMin, perImageInr: 349, perImageUsd: 4.49 },
      ],
    });
  };

  const removeTier = (index: number) => {
    onChange({
      ...settings,
      pricingTiers: tiers.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <AdminCard>
        <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
          Progressive bundle pricing
        </h2>
        <p className="mb-4 text-sm text-[var(--admin-muted)]">
          Per-image price bands for &quot;Add more images &amp; save more&quot;.
          The storefront picks the highest tier where selected count ≥
          minimum quantity.
        </p>
        <div className="space-y-3">
          {[...tiers]
            .sort((a, b) => a.minQuantity - b.minQuantity)
            .map((tier) => {
              const index = tiers.indexOf(tier);
              return (
                <div
                  key={tier.minQuantity + String(index)}
                  className="grid gap-3 rounded-xl border border-[var(--admin-border)] p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <AdminField label="Min. images">
                    <AdminInput
                      type="number"
                      min={1}
                      value={tier.minQuantity}
                      onChange={(e) =>
                        setTier(index, {
                          minQuantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Per image (INR)">
                    <AdminInput
                      type="number"
                      value={tier.perImageInr ?? ""}
                      onChange={(e) =>
                        setTier(index, {
                          perImageInr:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value) || undefined,
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Per image (USD)">
                    <AdminInput
                      type="number"
                      step="0.01"
                      value={tier.perImageUsd ?? ""}
                      onChange={(e) =>
                        setTier(index, {
                          perImageUsd:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value) || undefined,
                        })
                      }
                    />
                  </AdminField>
                  <div className="flex items-end justify-end">
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTier(index)}
                      aria-label="Remove tier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AdminButton>
                  </div>
                </div>
              );
            })}
        </div>
        <AdminButton
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={addTier}
        >
          <Plus className="h-3.5 w-3.5" /> Add tier
        </AdminButton>
      </AdminCard>

      <AdminCard>
        <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
          Deal defaults
        </h2>
        <p className="mb-4 text-sm text-[var(--admin-muted)]">
          Default visibility for full-collection and library bundle options.
          Individual AI images can override these in the product editor.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminToggle
            checked={deal.enableFullCollection !== false}
            onChange={(enableFullCollection) =>
              onChange({
                ...settings,
                dealDefaults: { ...deal, enableFullCollection },
              })
            }
            label="Enable full collection option"
          />
          <AdminToggle
            checked={deal.enableAddMoreImages !== false}
            onChange={(enableAddMoreImages) =>
              onChange({
                ...settings,
                dealDefaults: { ...deal, enableAddMoreImages },
              })
            }
            label="Enable add-more-images option"
          />
          <AdminField label="Collection badge (default)">
            <AdminInput
              value={deal.collectionBadgeText ?? "BEST VALUE"}
              onChange={(e) =>
                onChange({
                  ...settings,
                  dealDefaults: {
                    ...deal,
                    collectionBadgeText: e.target.value,
                  },
                })
              }
            />
          </AdminField>
          <AdminField label="Massive collection threshold (images)">
            <AdminInput
              type="number"
              min={1}
              value={deal.massiveCollectionThreshold ?? 12}
              onChange={(e) =>
                onChange({
                  ...settings,
                  dealDefaults: {
                    ...deal,
                    massiveCollectionThreshold:
                      Number(e.target.value) || 12,
                  },
                })
              }
            />
          </AdminField>
        </div>
      </AdminCard>

      <div className="flex justify-end">
        <AdminButton variant="primary" onClick={onSave}>
          Save Image PDP settings
        </AdminButton>
      </div>
    </div>
  );
}

/** Stable keys for new tiers in product editor. */
export function newPricingTierKey() {
  return uid("tier");
}
