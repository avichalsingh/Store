"use client";

import { ProductMediaSection } from "@/admin/components/media/ProductMediaSection";
import { ProductRelationshipsPanel } from "@/admin/components/products/ProductRelationshipsPanel";
import { ImageMediaSection } from "@/admin/components/media/ImageMediaSection";
import { AiImageTypeEditor } from "@/admin/components/products/typeEditors/AiImageTypeEditor";
import { BundleEditor } from "@/admin/components/bundles/BundleEditor";
import { CaptionPackTypeEditor } from "@/admin/components/products/typeEditors/CaptionPackTypeEditor";
import { PromptTypeEditor } from "@/admin/components/products/typeEditors/PromptTypeEditor";
import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSaveBar } from "@/admin/components/ui/AdminSaveBar";
import { discountPct, slugify, uid } from "@/admin/lib/format";
import { normalizeAdminProduct } from "@/admin/lib/normalizeProduct";
import { publishProductToCatalog } from "@/admin/lib/publishToCatalog";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import {
  emptyAiImageData,
  emptyCaptionPackData,
  emptyPromptData,
} from "@/catalog/productPayloads";
import {
  getProductTypeConfig,
  type ProductType,
} from "@/catalog/productTypes";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function blankProduct(type: ProductType = "VIDEO"): AdminProduct {
  const id = uid(type === "VIDEO" ? "vid" : type.toLowerCase().slice(0, 3));
  return normalizeAdminProduct({
    id,
    name: "",
    slug: "",
    productType: type,
    characterId: type === "VIDEO" ? "char-milo" : undefined,
    characterName: type === "VIDEO" ? "Milo" : undefined,
    category:
      type === "VIDEO"
        ? "Hip Hop"
        : type === "CAPTION_PACK"
            ? "Caption Packs"
            : type === "PROMPT"
              ? "Prompts"
              : type === "AI_IMAGE"
                ? "AI Images"
                : "Bundles",
    collectionIds: [],
    shortDescription: "",
    description: "",
    tags: [],
    status: "draft",
    isTrending: false,
    isFeatured: false,
    media: {
      thumbnail: type === "VIDEO" ? "/media/videos/pulse-drop.jpg" : "",
      downloadFileName: "",
      downloadFileSize: "",
    },
    pricing: {
      INR: { regularPrice: 999, currentPrice: 999 },
      USD: { regularPrice: 12.99, currentPrice: 12.99 },
    },
    offer: { enabled: false, label: "", startDate: "", endDate: "" },
    availability: { mode: "unlimited" },
    duration: type === "VIDEO" ? "0:15" : "",
    resolution: type === "VIDEO" ? "1080x1920" : "",
    format: type === "VIDEO" ? "MP4" : "",
    access: type === "VIDEO" ? "Instant access" : "Instant download",
    licenses:
      type === "VIDEO"
        ? [
            {
              id: "lic-personal",
              name: "Personal",
              description: "Social posts & personal projects",
              priceAdjustment: 0,
            },
          ]
        : [],
    sales: 0,
    revenueInr: 0,
    relationships: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function offerCountdown(end?: string) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `${d}d ${h}h remaining`;
}

export function ProductEditor({
  productId,
  productType,
}: {
  productId?: string;
  productType?: ProductType;
}) {
  const router = useRouter();
  const {
    products,
    characters,
    collections,
    upsertProduct,
    hydrated,
    pushToast,
  } = useAdmin();
  const existing = productId
    ? products.find((p) => p.id === productId)
    : undefined;
  const [draft, setDraft] = useState<AdminProduct | null>(null);
  const [baseline, setBaseline] = useState<string>("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (productId && !existing) return;
    const initial = existing
      ? structuredClone(existing)
      : blankProduct(productType ?? "VIDEO");
    if (!productId && initial.productType === "VIDEO" && characters[0]) {
      initial.characterId = characters[0].id;
      initial.characterName = characters[0].name;
    }
    setDraft(initial);
    setBaseline(JSON.stringify(initial));
    // Only re-init when switching products / hydration — not on every store sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, productId, productType]);

  const dirty = useMemo(
    () => !!draft && JSON.stringify(draft) !== baseline,
    [draft, baseline],
  );

  if (!hydrated) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading editor…</p>;
  }

  if (productId && !existing) {
    return (
      <p className="text-sm text-[var(--admin-danger)]">Product not found.</p>
    );
  }

  if (!draft) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading editor…</p>;
  }

  const type = draft.productType;
  const typeConfig = getProductTypeConfig(type);
  const isVideo = type === "VIDEO";

  if (type === "BUNDLE") {
    return <BundleEditor productId={productId} isNew={!productId} />;
  }

  const set = <K extends keyof AdminProduct>(
    key: K,
    value: AdminProduct[K],
  ) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const save = async (status?: AdminProduct["status"]) => {
    if (!draft || publishing) return;
    const next = {
      ...draft,
      status: status ?? draft.status,
      updatedAt: new Date().toISOString(),
      characterName:
        characters.find((c) => c.id === draft.characterId)?.name ??
        draft.characterName,
    };

    // Draft / archive: local CMS only — must not appear via catalog_products.
    if (next.status !== "active") {
      upsertProduct(next, "Product saved");
      setDraft(next);
      setBaseline(JSON.stringify(next));
      if (!productId) router.replace(`/admin/products/${next.id}/edit`);
      return;
    }

    setPublishing(true);
    try {
      const result = await publishProductToCatalog(next);
      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }
      upsertProduct(next, "Product published");
      setDraft(next);
      setBaseline(JSON.stringify(next));
      if (!productId) router.replace(`/admin/products/${next.id}/edit`);
    } finally {
      setPublishing(false);
    }
  };

  const inrPct = discountPct(
    draft.pricing.INR.regularPrice,
    draft.pricing.INR.currentPrice,
  );
  const usdPct = discountPct(
    draft.pricing.USD.regularPrice,
    draft.pricing.USD.currentPrice,
  );

  return (
    <div className="pb-16">
      <AdminPageHeader
        title={productId ? draft.name || "Edit product" : "New product"}
        description="Multi-market pricing, type-specific content, and relationships."
        actions={
          <>
            <AdminBadge tone="accent">{typeConfig.label}</AdminBadge>
            <AdminButton
              variant="secondary"
              onClick={() => void save("draft")}
              disabled={publishing}
            >
              Save draft
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => void save("active")}
              disabled={publishing}
            >
              {publishing ? "Publishing…" : "Publish"}
            </AdminButton>
          </>
        }
      />

      <div className="space-y-4">
        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Basic
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Name">
              <AdminInput
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          name,
                          slug: d.slug && productId ? d.slug : slugify(name),
                        }
                      : d,
                  );
                }}
              />
            </AdminField>
            <AdminField label="Slug">
              <AdminInput
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value)}
              />
            </AdminField>
            <AdminField label="Product type">
              <AdminInput value={typeConfig.label} disabled readOnly />
            </AdminField>
            {isVideo ? (
              <AdminField label="Character">
                <AdminSelect
                  value={draft.characterId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const ch = characters.find((c) => c.id === id);
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            characterId: id,
                            characterName: ch?.name ?? d.characterName,
                          }
                        : d,
                    );
                  }}
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
            ) : null}
            <AdminField label="Category">
              <AdminInput
                value={draft.category}
                onChange={(e) => set("category", e.target.value)}
              />
            </AdminField>
            <AdminField label="Short description" className="md:col-span-2">
              <AdminInput
                value={draft.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
              />
            </AdminField>
            <AdminField label="Description" className="md:col-span-2">
              <AdminTextarea
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </AdminField>
            <AdminField label="Tags (comma separated)" className="md:col-span-2">
              <AdminInput
                value={draft.tags.join(", ")}
                onChange={(e) =>
                  set(
                    "tags",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  )
                }
              />
            </AdminField>
          </div>
        </AdminCard>

        {isVideo ? (
          <ProductMediaSection
            draft={draft}
            onChange={(next) => {
              setDraft(next);
            }}
          />
        ) : null}

        {type === "AI_IMAGE" ? (
          <>
            <ImageMediaSection
              draft={draft}
              onChange={(next) => setDraft(next)}
            />
            <AiImageTypeEditor
              data={draft.aiImageData ?? emptyAiImageData()}
              onChange={(aiImageData) => set("aiImageData", aiImageData)}
              allProducts={products}
            />
            <AdminCard>
              <h2 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Image PDP sales copy
              </h2>
              <p className="mb-4 text-xs text-[var(--admin-muted)]">
                Keep this short. Title stays the image name; headline is a
                one-line emotional hook under it. Long descriptions belong in
                the bento, not under the title.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Offer eyebrow / badge" className="md:col-span-2">
                  <AdminInput
                    value={draft.campaign.label}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              campaign: {
                                ...d.campaign,
                                enabled: true,
                                label: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="LIMITED INTRO PRICE"
                  />
                </AdminField>
                <AdminField
                  label="Short emotional line (under title)"
                  className="md:col-span-2"
                >
                  <AdminInput
                    value={draft.campaign.headline}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              campaign: {
                                ...d.campaign,
                                enabled: true,
                                headline: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="One image. A lot can happen next."
                  />
                </AdminField>
                <AdminField
                  label="Supporting copy (optional — prefer leave empty)"
                  className="md:col-span-2"
                >
                  <AdminTextarea
                    value={draft.campaign.supportingText}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              campaign: {
                                ...d.campaign,
                                enabled: true,
                                supportingText: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    rows={2}
                    placeholder="Usually leave blank — possibilities live in the bento."
                  />
                </AdminField>
              </div>
            </AdminCard>
            <AdminCard>
              <h2 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Why this works cards
              </h2>
              <p className="mb-4 text-xs text-[var(--admin-muted)]">
                Three compact cards on the Image PDP. Leave empty for defaults.
              </p>
              <div className="space-y-4">
                {([0, 1, 2] as const).map((index) => {
                  const card = draft.pdpValueCards?.[index] ?? {
                    badge: "",
                    title: "",
                    description: "",
                  };
                  const updateCard = (
                    patch: Partial<{
                      badge: string;
                      title: string;
                      description: string;
                    }>,
                  ) => {
                    setDraft((d) => {
                      if (!d) return d;
                      const next = [
                        ...(d.pdpValueCards ?? [
                          { badge: "", title: "", description: "" },
                          { badge: "", title: "", description: "" },
                          { badge: "", title: "", description: "" },
                        ]),
                      ];
                      while (next.length < 3) {
                        next.push({ badge: "", title: "", description: "" });
                      }
                      next[index] = { ...next[index], ...patch };
                      return { ...d, pdpValueCards: next };
                    });
                  };
                  return (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border border-[var(--admin-border)] p-3 md:grid-cols-3"
                    >
                      <AdminField label={`Card ${index + 1} icon / badge`}>
                        <AdminInput
                          value={card.badge}
                          onChange={(e) =>
                            updateCard({ badge: e.target.value })
                          }
                          placeholder={["👀", "💬", "📤"][index]}
                        />
                      </AdminField>
                      <AdminField label="Title" className="md:col-span-2">
                        <AdminInput
                          value={card.title}
                          onChange={(e) =>
                            updateCard({ title: e.target.value })
                          }
                        />
                      </AdminField>
                      <AdminField
                        label="Description"
                        className="md:col-span-3"
                      >
                        <AdminTextarea
                          value={card.description}
                          onChange={(e) =>
                            updateCard({ description: e.target.value })
                          }
                          rows={2}
                        />
                      </AdminField>
                    </div>
                  );
                })}
              </div>
            </AdminCard>
          </>
        ) : null}

        {type === "PROMPT" ? (
          <PromptTypeEditor
            data={draft.promptData ?? emptyPromptData()}
            onChange={(promptData) => set("promptData", promptData)}
          />
        ) : null}

        {type === "CAPTION_PACK" ? (
          <CaptionPackTypeEditor
            data={draft.captionPackData ?? emptyCaptionPackData()}
            onChange={(captionPackData) =>
              set("captionPackData", captionPackData)
            }
          />
        ) : null}

        <ProductRelationshipsPanel
          draft={draft}
          allProducts={products}
          onChange={(relationships) => set("relationships", relationships)}
        />

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Pricing
          </h2>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--admin-border)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                India · INR
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Regular">
                  <AdminInput
                    type="number"
                    value={draft.pricing.INR.regularPrice}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              pricing: {
                                ...d.pricing,
                                INR: {
                                  ...d.pricing.INR,
                                  regularPrice: Number(e.target.value),
                                },
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Current">
                  <AdminInput
                    type="number"
                    value={draft.pricing.INR.currentPrice}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              pricing: {
                                ...d.pricing,
                                INR: {
                                  ...d.pricing.INR,
                                  currentPrice: Number(e.target.value),
                                },
                              },
                            }
                          : d,
                      )
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
                    step="0.01"
                    value={draft.pricing.USD.regularPrice}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              pricing: {
                                ...d.pricing,
                                USD: {
                                  ...d.pricing.USD,
                                  regularPrice: Number(e.target.value),
                                },
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Current">
                  <AdminInput
                    type="number"
                    step="0.01"
                    value={draft.pricing.USD.currentPrice}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              pricing: {
                                ...d.pricing,
                                USD: {
                                  ...d.pricing.USD,
                                  currentPrice: Number(e.target.value),
                                },
                              },
                            }
                          : d,
                      )
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
              checked={draft.offer.enabled}
              onChange={(enabled) =>
                setDraft((d) =>
                  d ? { ...d, offer: { ...d.offer, enabled } } : d,
                )
              }
              label="Enable offer countdown"
            />
            {draft.offer.enabled ? (
              <div className="grid gap-3 md:grid-cols-3">
                <AdminField label="Label">
                  <AdminInput
                    value={draft.offer.label}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              offer: { ...d.offer, label: e.target.value },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Start">
                  <AdminInput
                    type="datetime-local"
                    value={(draft.offer.startDate ?? "").slice(0, 16)}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              offer: {
                                ...d.offer,
                                startDate: new Date(
                                  e.target.value,
                                ).toISOString(),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="End">
                  <AdminInput
                    type="datetime-local"
                    value={(draft.offer.endDate ?? "").slice(0, 16)}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              offer: {
                                ...d.offer,
                                endDate: new Date(e.target.value).toISOString(),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <p className="text-sm text-[var(--admin-accent)] md:col-span-3">
                  Preview:{" "}
                  {offerCountdown(draft.offer.endDate) ?? "Set an end date"}
                </p>
              </div>
            ) : null}
          </div>
        </AdminCard>

        {isVideo ? (
          <>
            <AdminCard>
              <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Performance
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <AdminField label="Data mode">
                  <AdminSelect
                    value={draft.performance.mode}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                mode: e.target
                                  .value as AdminProduct["performance"]["mode"],
                              },
                            }
                          : d,
                      )
                    }
                  >
                    <option value="demo">Demo</option>
                    <option value="manual">Manual</option>
                    <option value="verified">Verified</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Plays label">
                  <AdminInput
                    value={draft.performance.plays}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                plays: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Plays numeric">
                  <AdminInput
                    type="number"
                    value={draft.performance.playsNumeric}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                playsNumeric: Number(e.target.value),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Likes">
                  <AdminInput
                    value={draft.performance.likes}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                likes: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Shares">
                  <AdminInput
                    value={draft.performance.shares}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                shares: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Engagement %">
                  <AdminInput
                    type="number"
                    step="0.1"
                    value={draft.performance.engagementPct}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                engagementPct: Number(e.target.value),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Status">
                  <AdminSelect
                    value={draft.performance.status}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                status: e.target
                                  .value as AdminProduct["performance"]["status"],
                              },
                            }
                          : d,
                      )
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="high-engagement">High engagement</option>
                    <option value="trending">Trending</option>
                    <option value="viral">Viral</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Badge">
                  <AdminInput
                    value={draft.performance.badge}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                badge: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="TRENDING NOW"
                  />
                </AdminField>
                <AdminField label="Metric unit label">
                  <AdminInput
                    value={draft.performance.metricLabel ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                metricLabel: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="PLAYS"
                  />
                </AdminField>
                <AdminField label="Engagement line" className="md:col-span-2">
                  <AdminInput
                    value={draft.performance.engagementText ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                engagementText: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="218K likes · 42K shares (optional — auto from likes/shares if empty)"
                  />
                </AdminField>
                <AdminField label="Insight" className="md:col-span-3">
                  <AdminInput
                    value={draft.performance.insight}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                insight: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="Strong hook retention in the first 3 seconds."
                  />
                </AdminField>
                <AdminField label="Supporting text" className="md:col-span-2">
                  <AdminInput
                    value={draft.performance.supportingText ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                supportingText: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="This format is gaining momentum right now."
                  />
                </AdminField>
                <AdminField label="Momentum label">
                  <AdminInput
                    value={draft.performance.momentumLabel ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              performance: {
                                ...d.performance,
                                momentumLabel: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="MOMENTUM IS CLIMBING ↑"
                  />
                </AdminField>
              </div>
            </AdminCard>

            <AdminCard>
              <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Creator activity
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <AdminField label="Data mode">
                  <AdminSelect
                    value={draft.creatorActivity.mode}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              creatorActivity: {
                                ...d.creatorActivity,
                                mode: e.target
                                  .value as AdminProduct["creatorActivity"]["mode"],
                              },
                            }
                          : d,
                      )
                    }
                  >
                    <option value="demo">Demo</option>
                    <option value="manual">Manual</option>
                    <option value="verified">Verified</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Added this week">
                  <AdminInput
                    type="number"
                    value={draft.creatorActivity.addedThisWeek}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              creatorActivity: {
                                ...d.creatorActivity,
                                addedThisWeek: Number(e.target.value),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Saved">
                  <AdminInput
                    type="number"
                    value={draft.creatorActivity.saved}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              creatorActivity: {
                                ...d.creatorActivity,
                                saved: Number(e.target.value),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Last 24h">
                  <AdminInput
                    type="number"
                    value={draft.creatorActivity.last24h}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              creatorActivity: {
                                ...d.creatorActivity,
                                last24h: Number(e.target.value),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Activity level">
                  <AdminSelect
                    value={draft.creatorActivity.activityLevel}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              creatorActivity: {
                                ...d.creatorActivity,
                                activityLevel: e.target
                                  .value as AdminProduct["creatorActivity"]["activityLevel"],
                              },
                            }
                          : d,
                      )
                    }
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Note" className="md:col-span-3">
                  <AdminInput
                    value={draft.creatorActivity.note}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              creatorActivity: {
                                ...d.creatorActivity,
                                note: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                  />
                </AdminField>
              </div>
            </AdminCard>

            <AdminCard>
              <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Campaign
              </h2>
              <AdminToggle
                checked={draft.campaign.enabled}
                onChange={(enabled) =>
                  setDraft((d) =>
                    d ? { ...d, campaign: { ...d.campaign, enabled } } : d,
                  )
                }
                label="Enable product campaign block"
              />
              {draft.campaign.enabled ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <AdminField label="Label">
                    <AdminInput
                      value={draft.campaign.label}
                      onChange={(e) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                campaign: {
                                  ...d.campaign,
                                  label: e.target.value,
                                },
                              }
                            : d,
                        )
                      }
                    />
                  </AdminField>
                  <AdminField label="CTA">
                    <AdminInput
                      value={draft.campaign.ctaText}
                      onChange={(e) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                campaign: {
                                  ...d.campaign,
                                  ctaText: e.target.value,
                                },
                              }
                            : d,
                        )
                      }
                    />
                  </AdminField>
                  <AdminField label="Headline" className="md:col-span-2">
                    <AdminInput
                      value={draft.campaign.headline}
                      onChange={(e) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                campaign: {
                                  ...d.campaign,
                                  headline: e.target.value,
                                },
                              }
                            : d,
                        )
                      }
                    />
                  </AdminField>
                  <AdminField label="Supporting text" className="md:col-span-2">
                    <AdminTextarea
                      value={draft.campaign.supportingText}
                      onChange={(e) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                campaign: {
                                  ...d.campaign,
                                  supportingText: e.target.value,
                                },
                              }
                            : d,
                        )
                      }
                    />
                  </AdminField>
                  <div className="md:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-[var(--admin-muted)]">
                        Micro-messages
                      </p>
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  campaign: {
                                    ...d.campaign,
                                    microMessages: [
                                      ...d.campaign.microMessages,
                                      "",
                                    ],
                                  },
                                }
                              : d,
                          )
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </AdminButton>
                    </div>
                    <div className="space-y-2">
                      {draft.campaign.microMessages.map((msg, i) => (
                        <div key={i} className="flex gap-2">
                          <AdminInput
                            value={msg}
                            onChange={(e) =>
                              setDraft((d) => {
                                if (!d) return d;
                                const microMessages = [
                                  ...d.campaign.microMessages,
                                ];
                                microMessages[i] = e.target.value;
                                return {
                                  ...d,
                                  campaign: { ...d.campaign, microMessages },
                                };
                              })
                            }
                          />
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      campaign: {
                                        ...d.campaign,
                                        microMessages:
                                          d.campaign.microMessages.filter(
                                            (_, j) => j !== i,
                                          ),
                                      },
                                    }
                                  : d,
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </AdminButton>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </AdminCard>
          </>
        ) : null}

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Details
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {isVideo ? (
              <>
                <AdminField label="Duration">
                  <AdminInput
                    value={draft.duration}
                    onChange={(e) => set("duration", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Resolution">
                  <AdminInput
                    value={draft.resolution}
                    onChange={(e) => set("resolution", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Format">
                  <AdminInput
                    value={draft.format}
                    onChange={(e) => set("format", e.target.value)}
                  />
                </AdminField>
              </>
            ) : null}
            <AdminField
              label="Access"
              className={isVideo ? undefined : "md:col-span-3"}
            >
              <AdminInput
                value={draft.access}
                onChange={(e) => set("access", e.target.value)}
                placeholder="Instant access"
              />
            </AdminField>
            {isVideo ? (
              <>
                <AdminField label="Dimensions supporting">
                  <AdminInput
                    value={draft.fileDetails?.dimensionsSupporting ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              fileDetails: {
                                ...d.fileDetails,
                                dimensionsSupporting: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="Full HD vertical video"
                  />
                </AdminField>
                <AdminField label="Format supporting">
                  <AdminInput
                    value={draft.fileDetails?.formatSupporting ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              fileDetails: {
                                ...d.fileDetails,
                                formatSupporting: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="Ready-to-post file"
                  />
                </AdminField>
                <AdminField label="Access supporting">
                  <AdminInput
                    value={draft.fileDetails?.accessSupporting ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              fileDetails: {
                                ...d.fileDetails,
                                accessSupporting: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="Download after checkout"
                  />
                </AdminField>
                <AdminField label="Usage main">
                  <AdminInput
                    value={draft.fileDetails?.usageMain ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              fileDetails: {
                                ...d.fileDetails,
                                usageMain: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="Personal + social"
                  />
                </AdminField>
                <AdminField label="Usage supporting" className="md:col-span-2">
                  <AdminInput
                    value={draft.fileDetails?.usageSupporting ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              fileDetails: {
                                ...d.fileDetails,
                                usageSupporting: e.target.value,
                              },
                            }
                          : d,
                      )
                    }
                    placeholder="Use it in your own content"
                  />
                </AdminField>
              </>
            ) : null}
            <AdminField label="Collections" className="md:col-span-3">
              <div className="flex flex-wrap gap-2">
                {collections.map((c) => {
                  const on = draft.collectionIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        set(
                          "collectionIds",
                          on
                            ? draft.collectionIds.filter((id) => id !== c.id)
                            : [...draft.collectionIds, c.id],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        on
                          ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
                          : "border-[var(--admin-border)] text-[var(--admin-muted)]"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </AdminField>
          </div>
        </AdminCard>

        {isVideo ? (
          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              PDP value cards
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Three cards under “Everything you need to post it today.” Leave
              empty to use storefront defaults.
            </p>
            <div className="space-y-4">
              {([0, 1, 2] as const).map((index) => {
                const card = draft.pdpValueCards?.[index] ?? {
                  badge: "",
                  title: "",
                  description: "",
                };
                const updateCard = (
                  patch: Partial<{
                    badge: string;
                    title: string;
                    description: string;
                  }>,
                ) => {
                  setDraft((d) => {
                    if (!d) return d;
                    const next = [
                      ...(d.pdpValueCards ?? [
                        { badge: "", title: "", description: "" },
                        { badge: "", title: "", description: "" },
                        { badge: "", title: "", description: "" },
                      ]),
                    ];
                    while (next.length < 3) {
                      next.push({ badge: "", title: "", description: "" });
                    }
                    next[index] = { ...next[index], ...patch };
                    return { ...d, pdpValueCards: next };
                  });
                };
                return (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-[var(--admin-border)] p-3 md:grid-cols-3"
                  >
                    <AdminField label={`Card ${index + 1} badge`}>
                      <AdminInput
                        value={card.badge}
                        onChange={(e) => updateCard({ badge: e.target.value })}
                        placeholder={
                          index === 0
                            ? "VIDEO INCLUDED"
                            : index === 1
                              ? "INSTANT ACCESS"
                              : "POST-READY"
                        }
                      />
                    </AdminField>
                    <AdminField label="Title" className="md:col-span-2">
                      <AdminInput
                        value={card.title}
                        onChange={(e) => updateCard({ title: e.target.value })}
                      />
                    </AdminField>
                    <AdminField label="Description" className="md:col-span-3">
                      <AdminTextarea
                        value={card.description}
                        onChange={(e) =>
                          updateCard({ description: e.target.value })
                        }
                        rows={2}
                      />
                    </AdminField>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        ) : null}

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Publishing
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <AdminField label="Status">
              <AdminSelect
                value={draft.status}
                onChange={(e) =>
                  set("status", e.target.value as AdminProduct["status"])
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </AdminSelect>
            </AdminField>
            <div className="flex items-end pb-2">
              <AdminToggle
                checked={draft.isTrending}
                onChange={(isTrending) => set("isTrending", isTrending)}
                label="Trending"
              />
            </div>
            <div className="flex items-end pb-2">
              <AdminToggle
                checked={draft.isFeatured}
                onChange={(isFeatured) => set("isFeatured", isFeatured)}
                label="Featured"
              />
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminSaveBar
        dirty={dirty}
        onSave={() => void save()}
        onDiscard={() => {
          const restored = JSON.parse(baseline) as AdminProduct;
          setDraft(restored);
        }}
        savingLabel="Save product"
      />
    </div>
  );
}
