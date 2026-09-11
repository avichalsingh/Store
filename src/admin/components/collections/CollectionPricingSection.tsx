"use client";

import {
  AdminField,
  AdminInput,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import {
  collectionOfferCountdown,
  collectionPricingErrors,
} from "@/admin/lib/collectionPricing";
import { discountPct } from "@/admin/lib/format";
import type { AdminCollection } from "@/admin/types";

export function CollectionPricingSection({
  collection,
  onChange,
}: {
  collection: AdminCollection;
  onChange: (patch: Partial<AdminCollection>) => void;
}) {
  const pricing = collection.pricing ?? {
    INR: { regularPrice: 0, currentPrice: 0 },
    USD: { regularPrice: 0, currentPrice: 0 },
  };
  const offer = collection.offer ?? { enabled: false, label: "" };

  const inrPct = discountPct(pricing.INR.regularPrice, pricing.INR.currentPrice);
  const usdPct = discountPct(pricing.USD.regularPrice, pricing.USD.currentPrice);
  const pricingErrors = collectionPricingErrors(pricing);

  const patchPricing = (
    market: "INR" | "USD",
    field: "regularPrice" | "currentPrice",
    value: number,
  ) => {
    onChange({
      pricing: {
        ...pricing,
        [market]: {
          ...pricing[market],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {pricingErrors.length > 0 ? (
        <div className="rounded-xl border border-[var(--admin-danger)]/30 bg-[var(--admin-danger-soft)] px-4 py-3 text-xs text-[var(--admin-danger)]">
          {pricingErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--admin-border)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            India · INR
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Regular">
              <AdminInput
                type="number"
                min={0}
                value={pricing.INR.regularPrice}
                onChange={(e) =>
                  patchPricing("INR", "regularPrice", Number(e.target.value))
                }
              />
            </AdminField>
            <AdminField label="Current">
              <AdminInput
                type="number"
                min={0}
                value={pricing.INR.currentPrice}
                onChange={(e) =>
                  patchPricing("INR", "currentPrice", Number(e.target.value))
                }
              />
            </AdminField>
          </div>
          {inrPct > 0 ? (
            <p className="mt-2 text-xs text-[var(--admin-accent)]">
              {inrPct}% off
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-[var(--admin-border)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Global · USD
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Regular">
              <AdminInput
                type="number"
                min={0}
                step="0.01"
                value={pricing.USD.regularPrice}
                onChange={(e) =>
                  patchPricing("USD", "regularPrice", Number(e.target.value))
                }
              />
            </AdminField>
            <AdminField label="Current">
              <AdminInput
                type="number"
                min={0}
                step="0.01"
                value={pricing.USD.currentPrice}
                onChange={(e) =>
                  patchPricing("USD", "currentPrice", Number(e.target.value))
                }
              />
            </AdminField>
          </div>
          {usdPct > 0 ? (
            <p className="mt-2 text-xs text-[var(--admin-accent)]">
              {usdPct}% off
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--admin-border)] p-4">
        <AdminToggle
          checked={offer.enabled}
          onChange={(enabled) =>
            onChange({ offer: { ...offer, enabled } })
          }
          label="Enable offer countdown"
        />
        {offer.enabled ? (
          <div className="grid gap-3 md:grid-cols-3">
            <AdminField label="Label">
              <AdminInput
                value={offer.label}
                onChange={(e) =>
                  onChange({ offer: { ...offer, label: e.target.value } })
                }
                placeholder="Save big"
              />
            </AdminField>
            <AdminField label="Start">
              <AdminInput
                type="datetime-local"
                value={(offer.startDate ?? "").slice(0, 16)}
                onChange={(e) =>
                  onChange({
                    offer: {
                      ...offer,
                      startDate: new Date(e.target.value).toISOString(),
                    },
                  })
                }
              />
            </AdminField>
            <AdminField label="End">
              <AdminInput
                type="datetime-local"
                value={(offer.endDate ?? "").slice(0, 16)}
                onChange={(e) =>
                  onChange({
                    offer: {
                      ...offer,
                      endDate: new Date(e.target.value).toISOString(),
                    },
                  })
                }
              />
            </AdminField>
            <p className="text-sm text-[var(--admin-accent)] md:col-span-3">
              Preview:{" "}
              {collectionOfferCountdown(offer.endDate) ?? "Set an end date"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
