"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import type { AdminProduct } from "@/admin/types";
import type { ImagePdpPricingTier } from "@/catalog/imagePdpTypes";
import type { AiImageData } from "@/catalog/productPayloads";
import { Plus, Trash2 } from "lucide-react";

/**
 * AI Image product settings (collection / deals / tiers).
 * Master + Preview media lives in ImageMediaSection (same pattern as videos).
 */
export function AiImageTypeEditor({
  data,
  onChange,
  allProducts = [],
}: {
  data: AiImageData;
  onChange: (d: AiImageData) => void;
  allProducts?: AdminProduct[];
}) {
  const isPack = Boolean(data.isCollectionPack);
  const tiers = data.pricingTiers ?? [];

  const collectionOptions = allProducts
    .filter(
      (p) =>
        p.productType === "AI_IMAGE" &&
        p.aiImageData?.isCollectionPack &&
        p.aiImageData?.collectionId,
    )
    .map((p) => ({
      id: p.aiImageData!.collectionId!,
      name: p.aiImageData?.collectionName || p.name,
      packId: p.id,
    }));

  const setMeta = <K extends keyof AiImageData>(
    key: K,
    value: AiImageData[K],
  ) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <AdminCard>
      <h2 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
        Image metadata
      </h2>
      <p className="mb-4 text-xs text-[var(--admin-muted)]">
        Deliverable specs shown on the PDP. Master and Preview files are managed
        above in Image media.
      </p>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <AdminField label="Resolution">
          <AdminInput
            value={data.resolution ?? ""}
            onChange={(e) => setMeta("resolution", e.target.value)}
            placeholder="2048x2048"
          />
        </AdminField>
        <AdminField label="Format">
          <AdminInput
            value={data.format ?? ""}
            onChange={(e) => setMeta("format", e.target.value)}
            placeholder="PNG"
          />
        </AdminField>
        <AdminField label="File size label">
          <AdminInput
            value={data.fileSizeLabel ?? ""}
            onChange={(e) => setMeta("fileSizeLabel", e.target.value)}
            placeholder="2.4 MB"
          />
        </AdminField>
      </div>

      <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Image collection &amp; deal settings
        </h3>
        <p className="mb-3 text-xs text-[var(--admin-muted)]">
          Soft grouping for Image PDP full-collection deals (separate from
          storefront Collections and commercial Bundles).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <AdminToggle
            checked={isPack}
            onChange={(isCollectionPack) =>
              setMeta("isCollectionPack", isCollectionPack)
            }
            label="Full collection pack SKU"
          />
          {!isPack ? (
            <>
              <AdminField label="Assign image collection">
                <select
                  className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm"
                  value={data.collectionId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || undefined;
                    const match = collectionOptions.find((c) => c.id === id);
                    onChange({
                      ...data,
                      collectionId: id,
                      collectionName: match?.name ?? data.collectionName,
                    });
                  }}
                >
                  <option value="">None</option>
                  {collectionOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Collection name (display)">
                <AdminInput
                  value={data.collectionName ?? ""}
                  onChange={(e) => setMeta("collectionName", e.target.value)}
                />
              </AdminField>
              <AdminToggle
                checked={data.dealSettings?.enableFullCollection !== false}
                onChange={(enableFullCollection) =>
                  setMeta("dealSettings", {
                    ...data.dealSettings,
                    enableFullCollection,
                  })
                }
                label="Enable full collection option on PDP"
              />
              <AdminToggle
                checked={data.dealSettings?.enableAddMoreImages !== false}
                onChange={(enableAddMoreImages) =>
                  setMeta("dealSettings", {
                    ...data.dealSettings,
                    enableAddMoreImages,
                  })
                }
                label="Enable add-more-images option on PDP"
              />
            </>
          ) : (
            <>
              <AdminField label="Collection ID">
                <AdminInput
                  value={data.collectionId ?? ""}
                  onChange={(e) => setMeta("collectionId", e.target.value)}
                  placeholder="col-cute-indian"
                />
              </AdminField>
              <AdminField label="Collection name">
                <AdminInput
                  value={data.collectionName ?? ""}
                  onChange={(e) => setMeta("collectionName", e.target.value)}
                />
              </AdminField>
              <AdminField label="Compare-at total (INR)">
                <AdminInput
                  type="number"
                  value={data.collectionBundle?.compareAtInr ?? ""}
                  onChange={(e) =>
                    setMeta("collectionBundle", {
                      ...data.collectionBundle,
                      compareAtInr:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value) || undefined,
                    })
                  }
                  placeholder="Uses pack regular price if empty"
                />
              </AdminField>
              <AdminField label="Compare-at total (USD)">
                <AdminInput
                  type="number"
                  step="0.01"
                  value={data.collectionBundle?.compareAtUsd ?? ""}
                  onChange={(e) =>
                    setMeta("collectionBundle", {
                      ...data.collectionBundle,
                      compareAtUsd:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value) || undefined,
                    })
                  }
                />
              </AdminField>
              <AdminField label="Bundle badge text">
                <AdminInput
                  value={data.collectionBundle?.badgeText ?? ""}
                  onChange={(e) =>
                    setMeta("collectionBundle", {
                      ...data.collectionBundle,
                      badgeText: e.target.value || undefined,
                    })
                  }
                  placeholder="BEST VALUE"
                />
              </AdminField>
            </>
          )}
        </div>
      </div>

      {!isPack ? (
        <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Per-product pricing tiers (optional)
              </h3>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Override global Image PDP tiers for this image only.
              </p>
            </div>
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() =>
                setMeta("pricingTiers", [
                  ...tiers,
                  {
                    minQuantity: tiers.length
                      ? Math.max(...tiers.map((t) => t.minQuantity)) + 1
                      : 1,
                    perImageInr: 799,
                    perImageUsd: 9.99,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add tier
            </AdminButton>
          </div>
          {tiers.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">
              Using global Image PDP pricing tiers.
            </p>
          ) : (
            <div className="space-y-2">
              {tiers.map((tier, index) => (
                <div
                  key={`${tier.minQuantity}-${index}`}
                  className="grid gap-2 rounded-lg border border-[var(--admin-border)] p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <AdminField label="Min. images">
                    <AdminInput
                      type="number"
                      value={tier.minQuantity}
                      onChange={(e) => {
                        const next = [...tiers] as ImagePdpPricingTier[];
                        next[index] = {
                          ...tier,
                          minQuantity: Number(e.target.value) || 1,
                        };
                        setMeta("pricingTiers", next);
                      }}
                    />
                  </AdminField>
                  <AdminField label="INR / image">
                    <AdminInput
                      type="number"
                      value={tier.perImageInr ?? ""}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[index] = {
                          ...tier,
                          perImageInr:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value) || undefined,
                        };
                        setMeta("pricingTiers", next);
                      }}
                    />
                  </AdminField>
                  <AdminField label="USD / image">
                    <AdminInput
                      type="number"
                      step="0.01"
                      value={tier.perImageUsd ?? ""}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[index] = {
                          ...tier,
                          perImageUsd:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value) || undefined,
                        };
                        setMeta("pricingTiers", next);
                      }}
                    />
                  </AdminField>
                  <div className="flex items-end justify-end">
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setMeta(
                          "pricingTiers",
                          tiers.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AdminButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Image PDP upsells &amp; intro timer
        </h3>
        <p className="mb-3 text-xs text-[var(--admin-muted)]">
          Optional. Timer only applies when an offer is enabled and sale &lt;
          regular.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <AdminField label="Intro timer (minutes)">
            <AdminInput
              type="number"
              value={data.introTimerMinutes ?? ""}
              onChange={(e) =>
                setMeta(
                  "introTimerMinutes",
                  e.target.value === ""
                    ? undefined
                    : Number(e.target.value) || undefined,
                )
              }
              placeholder="12"
            />
          </AdminField>
          <AdminField label="+1 image (INR)">
            <AdminInput
              type="number"
              value={data.quantityUpsells?.plusOneInr ?? ""}
              onChange={(e) =>
                setMeta("quantityUpsells", {
                  ...data.quantityUpsells,
                  plusOneInr:
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value) || undefined,
                })
              }
              placeholder="149"
            />
          </AdminField>
          <AdminField label="+3 images (INR)">
            <AdminInput
              type="number"
              value={data.quantityUpsells?.plusThreeInr ?? ""}
              onChange={(e) =>
                setMeta("quantityUpsells", {
                  ...data.quantityUpsells,
                  plusThreeInr:
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value) || undefined,
                })
              }
              placeholder="349"
            />
          </AdminField>
          <AdminField label="+1 image (USD)">
            <AdminInput
              type="number"
              value={data.quantityUpsells?.plusOneUsd ?? ""}
              onChange={(e) =>
                setMeta("quantityUpsells", {
                  ...data.quantityUpsells,
                  plusOneUsd:
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value) || undefined,
                })
              }
              placeholder="1.99"
            />
          </AdminField>
          <AdminField label="+3 images (USD)">
            <AdminInput
              type="number"
              value={data.quantityUpsells?.plusThreeUsd ?? ""}
              onChange={(e) =>
                setMeta("quantityUpsells", {
                  ...data.quantityUpsells,
                  plusThreeUsd:
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value) || undefined,
                })
              }
              placeholder="3.99"
            />
          </AdminField>
        </div>
      </div>
    </AdminCard>
  );
}
