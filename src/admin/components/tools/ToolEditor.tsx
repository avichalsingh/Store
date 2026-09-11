"use client";

import { AdminBadge, StatusBadge } from "@/admin/components/ui/AdminBadge";
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
import { blankTool } from "@/admin/lib/normalizeTool";
import { slugify, uid } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import {
  TOOL_AUTOMATION_MODES,
  TOOL_CATEGORIES,
  TOOL_CATEGORY_CONFIG,
  TOOL_DATA_ORIGINS,
  TOOL_MONITOR_FREQUENCIES,
  TOOL_PRICING_TYPES,
  TOOL_STATUSES,
  type AiTool,
  type ToolCategoryId,
  type ToolDataOrigin,
} from "@/catalog/tools/types";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function originTone(
  origin: ToolDataOrigin,
): "neutral" | "accent" | "success" | "warning" | "info" {
  switch (origin) {
    case "verified":
      return "success";
    case "imported":
      return "info";
    case "detected":
      return "warning";
    case "demo":
      return "accent";
    default:
      return "neutral";
  }
}

export function ToolEditor({
  toolId,
  initialDraft,
}: {
  toolId?: string;
  /** Pre-filled draft (e.g. from URL import). Used only when creating. */
  initialDraft?: Partial<AiTool>;
}) {
  const router = useRouter();
  const { aiTools, upsertAiTool, deleteAiTool, hydrated } = useAdmin();
  const existing = toolId ? aiTools.find((t) => t.id === toolId) : undefined;

  const [draft, setDraft] = useState<AiTool | null>(null);
  const [baseline, setBaseline] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (toolId && !existing) return;
    const initial = existing
      ? structuredClone(existing)
      : blankTool({
          id: uid("tool"),
          dataOrigin: initialDraft?.dataOrigin ?? "manual",
          ...initialDraft,
        });
    setDraft(initial);
    setBaseline(JSON.stringify(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, toolId]);

  const dirty = useMemo(
    () => !!draft && JSON.stringify(draft) !== baseline,
    [draft, baseline],
  );

  if (!hydrated) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading editor…</p>;
  }

  if (toolId && !existing) {
    return (
      <p className="text-sm text-[var(--admin-danger)]">Tool not found.</p>
    );
  }

  if (!draft) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading editor…</p>;
  }

  const set = <K extends keyof AiTool>(key: K, value: AiTool[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const save = (status?: AiTool["status"]) => {
    const next: AiTool = {
      ...draft,
      status: status ?? draft.status,
      slug: draft.slug || slugify(draft.name) || draft.id,
      categories: draft.categories.includes(draft.primaryCategory)
        ? draft.categories
        : [draft.primaryCategory, ...draft.categories],
      updatedAt: new Date().toISOString(),
    };
    upsertAiTool(
      next,
      status === "active" ? "Tool published" : "Tool draft saved",
    );
    setDraft(next);
    setBaseline(JSON.stringify(next));
    if (!toolId) router.replace(`/admin/tools/${next.id}/edit`);
  };

  const toggleCategory = (cat: ToolCategoryId) => {
    setDraft((d) => {
      if (!d) return d;
      const has = d.categories.includes(cat);
      let categories = has
        ? d.categories.filter((c) => c !== cat)
        : [...d.categories, cat];
      if (!categories.includes(d.primaryCategory)) {
        categories = [d.primaryCategory, ...categories];
      }
      if (categories.length === 0) categories = [d.primaryCategory];
      return { ...d, categories };
    });
  };

  return (
    <div className="pb-16">
      <AdminPageHeader
        title={toolId ? draft.name || "Edit tool" : "New AI tool"}
        description="Affiliate tools catalog — pricing and offers are editor-managed."
        actions={
          <>
            <AdminBadge tone={originTone(draft.dataOrigin)}>
              {draft.dataOrigin}
            </AdminBadge>
            <StatusBadge status={draft.status} />
            <AdminButton variant="secondary" onClick={() => save("draft")}>
              Save draft
            </AdminButton>
            <AdminButton variant="primary" onClick={() => save("active")}>
              Publish
            </AdminButton>
          </>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--admin-warning-soft)] bg-[color-mix(in_oklab,var(--admin-warning)_10%,white)] px-4 py-3 text-sm text-[var(--admin-text)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-warning)]" />
        <p>
          Live price monitoring is not connected in this environment. Pending
          changes can be simulated/demo reviewed.
        </p>
      </div>

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
                          slug: d.slug && toolId ? d.slug : slugify(name),
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
            <AdminField label="Official URL">
              <AdminInput
                value={draft.officialUrl}
                onChange={(e) => set("officialUrl", e.target.value)}
                placeholder="https://"
              />
            </AdminField>
            <AdminField label="Affiliate URL">
              <AdminInput
                value={draft.affiliateUrl ?? ""}
                onChange={(e) =>
                  set("affiliateUrl", e.target.value || undefined)
                }
                placeholder="https://"
              />
            </AdminField>
            <AdminField label="Logo URL">
              <AdminInput
                value={draft.logoUrl ?? ""}
                onChange={(e) => set("logoUrl", e.target.value || undefined)}
              />
            </AdminField>
            <AdminField label="Cover image URL">
              <AdminInput
                value={draft.coverImageUrl ?? ""}
                onChange={(e) =>
                  set("coverImageUrl", e.target.value || undefined)
                }
              />
            </AdminField>
            <AdminField label="Short description" className="md:col-span-2">
              <AdminTextarea
                value={draft.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                rows={2}
              />
            </AdminField>
            <AdminField label="Full description" className="md:col-span-2">
              <AdminTextarea
                value={draft.fullDescription}
                onChange={(e) => set("fullDescription", e.target.value)}
                rows={5}
              />
            </AdminField>
            <AdminField label="Best for" className="md:col-span-2">
              <AdminInput
                value={draft.bestFor}
                onChange={(e) => set("bestFor", e.target.value)}
              />
            </AdminField>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Classification
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Primary category">
              <AdminSelect
                value={draft.primaryCategory}
                onChange={(e) => {
                  const primaryCategory = e.target.value as ToolCategoryId;
                  setDraft((d) => {
                    if (!d) return d;
                    const categories = d.categories.includes(primaryCategory)
                      ? d.categories
                      : [primaryCategory, ...d.categories];
                    return { ...d, primaryCategory, categories };
                  });
                }}
              >
                {TOOL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {TOOL_CATEGORY_CONFIG[c].label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Status">
              <AdminSelect
                value={draft.status}
                onChange={(e) =>
                  set("status", e.target.value as AiTool["status"])
                }
              >
                {TOOL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Sort order">
              <AdminInput
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  set("sortOrder", Number(e.target.value) || 0)
                }
              />
            </AdminField>
            <AdminField label="Data origin">
              <AdminSelect
                value={draft.dataOrigin}
                onChange={(e) =>
                  set("dataOrigin", e.target.value as ToolDataOrigin)
                }
              >
                {TOOL_DATA_ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>

          <p className="mb-2 mt-4 text-xs font-medium text-[var(--admin-muted)]">
            Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {TOOL_CATEGORIES.map((c) => {
              const on = draft.categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={
                    on
                      ? "rounded-full bg-[var(--admin-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--admin-accent)]"
                      : "rounded-full bg-[var(--admin-surface-2)] px-3 py-1 text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  }
                >
                  {TOOL_CATEGORY_CONFIG[c].label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <AdminToggle
              checked={draft.featured}
              onChange={(v) => set("featured", v)}
              label="Featured"
            />
            <AdminToggle
              checked={draft.recommended}
              onChange={(v) => set("recommended", v)}
              label="Recommended"
            />
            <AdminToggle
              checked={draft.editorsPick}
              onChange={(v) => set("editorsPick", v)}
              label="Editor's pick"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AdminField label="Tags">
              <div className="flex gap-2">
                <AdminInput
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const t = tagInput.trim();
                      if (!t || draft.tags.includes(t)) return;
                      set("tags", [...draft.tags, t]);
                      setTagInput("");
                    }
                  }}
                />
                <AdminButton
                  size="sm"
                  onClick={() => {
                    const t = tagInput.trim();
                    if (!t || draft.tags.includes(t)) return;
                    set("tags", [...draft.tags, t]);
                    setTagInput("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </AdminButton>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {draft.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-surface-2)] px-2 py-0.5 text-[11px]"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "tags",
                          draft.tags.filter((x) => x !== t),
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3 text-[var(--admin-muted)]" />
                    </button>
                  </span>
                ))}
              </div>
            </AdminField>
            <AdminField label="Features">
              <div className="flex gap-2">
                <AdminInput
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Add feature"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const f = featureInput.trim();
                      if (!f || draft.features.includes(f)) return;
                      set("features", [...draft.features, f]);
                      setFeatureInput("");
                    }
                  }}
                />
                <AdminButton
                  size="sm"
                  onClick={() => {
                    const f = featureInput.trim();
                    if (!f || draft.features.includes(f)) return;
                    set("features", [...draft.features, f]);
                    setFeatureInput("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </AdminButton>
              </div>
              <ul className="mt-2 space-y-1">
                {draft.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{f}</span>
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "features",
                          draft.features.filter((x) => x !== f),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
            </AdminField>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Pricing
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Pricing type">
              <AdminSelect
                value={draft.pricing.pricingType}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            pricingType: e.target
                              .value as AiTool["pricing"]["pricingType"],
                          },
                        }
                      : d,
                  )
                }
              >
                {TOOL_PRICING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Currency">
              <AdminSelect
                value={draft.pricing.currency}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            currency: e.target
                              .value as AiTool["pricing"]["currency"],
                          },
                        }
                      : d,
                  )
                }
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="EUR">EUR</option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Regular price">
              <AdminInput
                type="number"
                min={0}
                step="0.01"
                value={draft.pricing.regularPrice ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            regularPrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Current price">
              <AdminInput
                type="number"
                min={0}
                step="0.01"
                value={draft.pricing.currentPrice ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            currentPrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Billing period">
              <AdminSelect
                value={draft.pricing.billingPeriod ?? "month"}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            billingPeriod: e.target
                              .value as AiTool["pricing"]["billingPeriod"],
                          },
                        }
                      : d,
                  )
                }
              >
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="one_time">One time</option>
                <option value="usage">Usage</option>
                <option value="unknown">Unknown</option>
              </AdminSelect>
            </AdminField>
            <div className="flex items-end pb-1">
              <AdminToggle
                checked={draft.pricing.freeTrialAvailable}
                onChange={(v) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: { ...d.pricing, freeTrialAvailable: v },
                        }
                      : d,
                  )
                }
                label="Free trial available"
              />
            </div>
            <AdminField label="Free trial details" className="md:col-span-2">
              <AdminInput
                value={draft.pricing.freeTrialDetails ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            freeTrialDetails: e.target.value || undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Pricing notes" className="md:col-span-2">
              <AdminTextarea
                value={draft.pricing.pricingNotes ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            pricingNotes: e.target.value || undefined,
                          },
                        }
                      : d,
                  )
                }
                rows={2}
              />
            </AdminField>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Sale / Offer
          </h2>
          <AdminToggle
            checked={draft.offer.saleActive}
            onChange={(v) =>
              setDraft((d) =>
                d ? { ...d, offer: { ...d.offer, saleActive: v } } : d,
              )
            }
            label="Sale active"
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AdminField label="Sale title">
              <AdminInput
                value={draft.offer.saleTitle ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            saleTitle: e.target.value || undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="CTA text">
              <AdminInput
                value={draft.offer.offerCtaText ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            offerCtaText: e.target.value || undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Regular price (offer)">
              <AdminInput
                type="number"
                min={0}
                step="0.01"
                value={draft.offer.regularPrice ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            regularPrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Sale price">
              <AdminInput
                type="number"
                min={0}
                step="0.01"
                value={draft.offer.salePrice ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            salePrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Discount %">
              <AdminInput
                type="number"
                min={0}
                max={100}
                value={draft.offer.discountPercent ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            discountPercent: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Sale start">
              <AdminInput
                type="datetime-local"
                value={toLocalInput(draft.offer.saleStartDate)}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            saleStartDate: fromLocalInput(e.target.value),
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Sale end">
              <AdminInput
                type="datetime-local"
                value={toLocalInput(draft.offer.saleEndDate)}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            saleEndDate: fromLocalInput(e.target.value),
                          },
                        }
                      : d,
                  )
                }
              />
            </AdminField>
            <AdminField label="Offer description" className="md:col-span-2">
              <AdminTextarea
                value={draft.offer.offerDescription ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          offer: {
                            ...d.offer,
                            offerDescription: e.target.value || undefined,
                          },
                        }
                      : d,
                  )
                }
                rows={2}
              />
            </AdminField>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Monitoring
          </h2>
          <AdminToggle
            checked={draft.monitoring.enabled}
            onChange={(v) =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      monitoring: {
                        ...d.monitoring,
                        enabled: v,
                        status: v ? d.monitoring.status : "not_monitored",
                        liveMonitoringAvailable: false,
                      },
                    }
                  : d,
              )
            }
            label="Enable monitoring (demo / review only)"
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AdminField label="Source URL" className="md:col-span-2">
              <AdminInput
                value={draft.monitoring.sourceUrl ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          monitoring: {
                            ...d.monitoring,
                            sourceUrl: e.target.value || undefined,
                          },
                        }
                      : d,
                  )
                }
                placeholder="Pricing page URL"
              />
            </AdminField>
            <AdminField label="Frequency">
              <AdminSelect
                value={draft.monitoring.frequency}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          monitoring: {
                            ...d.monitoring,
                            frequency: e.target
                              .value as AiTool["monitoring"]["frequency"],
                          },
                        }
                      : d,
                  )
                }
              >
                {TOOL_MONITOR_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Automation mode">
              <AdminSelect
                value={draft.monitoring.automationMode}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          monitoring: {
                            ...d.monitoring,
                            automationMode: e.target
                              .value as AiTool["monitoring"]["automationMode"],
                          },
                        }
                      : d,
                  )
                }
              >
                {TOOL_AUTOMATION_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>
          <p className="mt-3 text-xs text-[var(--admin-muted)]">
            Status: {draft.monitoring.status}
            {draft.monitoring.lastCheckedAt
              ? ` · Last checked ${new Date(draft.monitoring.lastCheckedAt).toLocaleString()}`
              : ""}
            . Live checks are not running in this environment.
          </p>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Source notes
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Gallery URLs (comma-separated)" className="md:col-span-2">
              <AdminTextarea
                value={draft.galleryUrls.join(", ")}
                onChange={(e) =>
                  set(
                    "galleryUrls",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                rows={2}
              />
            </AdminField>
            <AdminField
              label="Pricing notes (source)"
              className="md:col-span-2"
              hint="Where prices came from, verification notes, etc."
            >
              <AdminTextarea
                value={draft.pricing.pricingNotes ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pricing: {
                            ...d.pricing,
                            pricingNotes: e.target.value || undefined,
                          },
                        }
                      : d,
                  )
                }
                rows={3}
              />
            </AdminField>
          </div>
        </AdminCard>

        {dirty ? (
          <p className="text-xs text-[var(--admin-muted)]">Unsaved changes</p>
        ) : null}

        {toolId ? (
          <div className="flex justify-end">
            <AdminButton
              variant="danger"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm("Delete this tool?")
                ) {
                  return;
                }
                deleteAiTool(toolId);
                router.push("/admin/tools");
              }}
            >
              Delete tool
            </AdminButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
