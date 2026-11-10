"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSaveBar } from "@/admin/components/ui/AdminSaveBar";
import { HomepageEntityPicker } from "@/admin/components/homepage/HomepageEntityPicker";
import {
  COPY_FIELD_LABELS,
  HOMEPAGE_SECTION_FIELDS,
  lineupAddLabel,
  type HomepageCopyField,
} from "@/admin/lib/homepageSectionFields";
import { publishHomepageToCatalog } from "@/admin/lib/publishHomepageToCatalog";
import { useAdmin } from "@/admin/store/AdminProvider";
import type {
  HomepageHeroConfig,
  HomepageSection,
  HomepageSectionCopy,
  HomepageSectionId,
  HomepageTickerEntry,
} from "@/admin/types";
import {
  DEFAULT_HOMEPAGE_HERO_COLLAGE,
  DEFAULT_TICKER_ENTRIES,
  HERO_COLLAGE_PREVIEW_MAX,
  defaultMaxItemsForSection,
  normalizeHomepageHero,
  normalizeHomepageSections,
  reindexHomepageSections,
  toHomepageConfigDocument,
} from "@/catalog/homepageConfig";
import type { HomepagePublicApiResponse } from "@/catalog/homepagePublished";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function HomepagePage() {
  const {
    homepageSections,
    homepageHero,
    products,
    setHomepageSections,
    setHomepageHero,
    homepagePreviewDraft,
    setHomepagePreviewDraft,
    pushToast,
    hydrated,
  } = useAdmin();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [hero, setHero] = useState<HomepageHeroConfig | null>(null);
  const [selectedId, setSelectedId] = useState<HomepageSectionId>("hero");
  const [baseSections, setBaseSections] = useState("");
  const [baseHero, setBaseHero] = useState("");
  const [tickerDragId, setTickerDragId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedRevision, setPublishedRevision] = useState(0);

  const dirty = useMemo(
    () =>
      !!hero &&
      baseSections !== "" &&
      (JSON.stringify(sections) !== baseSections ||
        JSON.stringify(hero) !== baseHero),
    [sections, hero, baseSections, baseHero],
  );
  // Read at effect *run* time — a stale closure of `dirty === false` was
  // overwriting collage picks when AdminProvider re-emitted during confirm.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!hydrated) return;
    // Do not clobber in-progress local collage/section edits when the provider
    // re-emits the same logical draft (e.g. after unrelated CMS state writes).
    // Never overwrite a dirty local draft with remotely published content.
    if (dirtyRef.current) return;
    const nextSections = normalizeHomepageSections(homepageSections);
    const nextHero = normalizeHomepageHero(homepageHero);
    setSections(nextSections);
    setHero(nextHero);
    setBaseSections(JSON.stringify(nextSections));
    setBaseHero(JSON.stringify(nextHero));
    setSelectedId((prev) =>
      nextSections.some((s) => s.id === prev) ? prev : nextSections[0]!.id,
    );
  }, [hydrated, homepageSections, homepageHero]);

  useEffect(() => {
    let cancelled = false;
    async function loadPublishedMeta() {
      try {
        const res = await fetch("/api/homepage");
        const body = (await res.json()) as HomepagePublicApiResponse;
        if (cancelled) return;
        if (typeof body.publishedRevision === "number") {
          setPublishedRevision(Math.max(0, Math.floor(body.publishedRevision)));
        }
      } catch {
        // Keep revision 0 — publish conflict check still works once remote exists.
      }
    }
    void loadPublishedMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated || !hero) return null;

  const collage = hero.collage ?? DEFAULT_HOMEPAGE_HERO_COLLAGE;
  const patchCollage = (
    patch: Partial<typeof DEFAULT_HOMEPAGE_HERO_COLLAGE>,
  ) => {
    setHero((prev) => {
      if (!prev) return prev;
      const prevCollage = prev.collage ?? DEFAULT_HOMEPAGE_HERO_COLLAGE;
      return {
        ...prev,
        collage: { ...prevCollage, ...patch },
      };
    });
  };

  const ordered = reindexHomepageSections(sections);
  const selected = ordered.find((s) => s.id === selectedId) ?? ordered[0]!;
  const fields = HOMEPAGE_SECTION_FIELDS[selected.id];

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ordered];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    setSections(reindexHomepageSections(next));
  };

  const patchSection = (
    id: HomepageSectionId,
    patch: Partial<HomepageSection>,
  ) => {
    setSections((prev) =>
      reindexHomepageSections(
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      ),
    );
  };

  const patchCopy = (key: HomepageCopyField, value: string) => {
    const copy: HomepageSectionCopy = { ...(selected.copy ?? {}), [key]: value };
    patchSection(selected.id, { copy });
  };

  const setCuratedIds = (
    slot: "productIds" | "collectionIds",
    next: string[],
  ) => {
    patchSection(selected.id, {
      content: {
        ...(selected.content ?? {}),
        [slot]: next,
      },
    });
  };

  const tickerEntries: HomepageTickerEntry[] =
    selected.content?.tickerEntries ?? DEFAULT_TICKER_ENTRIES;

  const setTickerEntries = (next: HomepageTickerEntry[]) => {
    patchSection(selected.id, {
      content: {
        ...(selected.content ?? {}),
        tickerEntries: next.map((entry, order) => ({ ...entry, order })),
      },
    });
  };

  const patchTickerEntry = (
    id: string,
    patch: Partial<HomepageTickerEntry>,
  ) => {
    setTickerEntries(
      tickerEntries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const moveTickerEntry = (id: string, direction: -1 | 1) => {
    const orderedEntries = [...tickerEntries].sort((a, b) => a.order - b.order);
    const index = orderedEntries.findIndex((e) => e.id === id);
    const j = index + direction;
    if (index < 0 || j < 0 || j >= orderedEntries.length) return;
    const tmp = orderedEntries[index]!;
    orderedEntries[index] = orderedEntries[j]!;
    orderedEntries[j] = tmp;
    setTickerEntries(orderedEntries);
  };

  const onTickerDropReorder = (toId: string) => {
    if (!tickerDragId || tickerDragId === toId) {
      setTickerDragId(null);
      return;
    }
    const orderedEntries = [...tickerEntries].sort((a, b) => a.order - b.order);
    const from = orderedEntries.findIndex((e) => e.id === tickerDragId);
    const to = orderedEntries.findIndex((e) => e.id === toId);
    if (from < 0 || to < 0) {
      setTickerDragId(null);
      return;
    }
    const next = [...orderedEntries];
    const [moved] = next.splice(from, 1);
    if (!moved) {
      setTickerDragId(null);
      return;
    }
    next.splice(to, 0, moved);
    setTickerEntries(next);
    setTickerDragId(null);
  };

  const patchMaxItems = (value: number) => {
    const floor = Math.max(0, Math.floor(value));
    patchSection(selected.id, {
      content: {
        ...(selected.content ?? {}),
        maxItems: floor,
      },
    });
  };


  const addTickerEntry = () => {
    const id = `ticker-${Date.now().toString(36)}`;
    setTickerEntries([
      ...tickerEntries,
      {
        id,
        label: "New ticker item",
        metric: "",
        href: "/explore",
        order: tickerEntries.length,
        enabled: true,
      },
    ]);
  };

  const removeTickerEntry = (id: string) => {
    setTickerEntries(tickerEntries.filter((entry) => entry.id !== id));
  };

  const save = () => {
    const nextSections = normalizeHomepageSections(sections);
    const nextHero = normalizeHomepageHero(hero);
    setHomepageSections(nextSections, null);
    setHomepageHero(nextHero, "Homepage draft saved locally");
    setSections(nextSections);
    setHero(nextHero);
    setBaseSections(JSON.stringify(nextSections));
    setBaseHero(JSON.stringify(nextHero));
  };

  const publishHomepage = async () => {
    if (publishing) return;
    // Persist draft first so localStorage matches what we publish.
    const nextSections = normalizeHomepageSections(sections);
    const nextHero = normalizeHomepageHero(hero);
    setHomepageSections(nextSections, null);
    setHomepageHero(nextHero, null);
    setSections(nextSections);
    setHero(nextHero);
    setBaseSections(JSON.stringify(nextSections));
    setBaseHero(JSON.stringify(nextHero));

    setPublishing(true);
    try {
      const document = toHomepageConfigDocument(nextSections, nextHero);
      const result = await publishHomepageToCatalog(
        document,
        publishedRevision,
      );
      if (!result.ok) {
        if (
          result.status === 409 &&
          typeof result.currentPublishedRevision === "number"
        ) {
          setPublishedRevision(result.currentPublishedRevision);
        }
        pushToast(result.error, "error");
        return;
      }
      if (!result.dryRun) {
        setPublishedRevision(result.publishedRevision);
      }
      pushToast(result.message, result.dryRun ? "info" : "success");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="pb-16">
      <AdminPageHeader
        title="Homepage"
        description="Control section visibility, order, copy, and curated content for the storefront homepage. Save keeps a local draft; Publish shares the homepage with all visitors."
        actions={
          <>
            <AdminToggle
              checked={homepagePreviewDraft}
              onChange={setHomepagePreviewDraft}
              label="Preview draft"
            />
            <AdminButton variant="secondary" onClick={save} disabled={!dirty}>
              Save homepage
            </AdminButton>
            <AdminButton
              variant="primary"
              disabled={publishing}
              onClick={() => void publishHomepage()}
            >
              {publishing ? "Publishing…" : "Publish homepage"}
            </AdminButton>
          </>
        }
      />
      {homepagePreviewDraft ? (
        <p className="mb-4 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs text-[var(--admin-muted)]">
          Preview draft is on — this browser&apos;s storefront homepage uses your
          local draft. Visitors and other browsers still see the last published
          configuration (or defaults when unpublished).
        </p>
      ) : (
        <p className="mb-4 text-xs text-[var(--admin-muted)]">
          Storefront preview defaults to the published homepage. Turn on Preview
          draft to review unsaved local edits on{" "}
          <Link href="/" className="underline underline-offset-2">
            the storefront
          </Link>
          .
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <AdminCard className="shrink-0 lg:sticky lg:top-4 lg:w-[13.5rem] lg:self-start">
          <h2 className="mb-2 font-[family-name:var(--font-syne)] text-sm font-semibold">
            Sections
          </h2>
          <ul className="space-y-1">
            {ordered.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 ${
                  selected.id === s.id
                    ? "border-[var(--admin-accent)] bg-[var(--admin-accent)]/5"
                    : "border-[var(--admin-border)]"
                }`}
              >
                <div className="flex shrink-0 flex-col gap-0">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp className="h-3 w-3 text-[var(--admin-muted)]" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown className="h-3 w-3 text-[var(--admin-muted)]" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-medium leading-tight">{s.label}</p>
                </button>
                <AdminToggle
                  checked={s.enabled}
                  onChange={(enabled) => patchSection(s.id, { enabled })}
                />
              </li>
            ))}
          </ul>
        </AdminCard>

        <div className="min-w-0 flex-1 space-y-4">
          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              {selected.label}
            </h2>
            <p className="mb-4 text-[11px] text-[var(--admin-muted)]">
              {selected.id}
              {fields.featuredMerchandising
                ? " · Featured merchandising (independent of Trending carousel)"
                : null}
              {selected.id === "trending"
                ? " · Trending carousel picks only — does not drive Featured sections"
                : null}
              {selected.id === "ai-tools"
                ? " · Tools catalog excluded from this release"
                : null}
            </p>

            {selected.id === "hero" ? (
              <div className="space-y-3">
                <AdminField label="Headline">
                  <AdminInput
                    value={hero.headline}
                    onChange={(e) =>
                      setHero({ ...hero, headline: e.target.value })
                    }
                  />
                </AdminField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminField label="CTA text">
                    <AdminInput
                      value={hero.ctaText}
                      onChange={(e) =>
                        setHero({ ...hero, ctaText: e.target.value })
                      }
                    />
                  </AdminField>
                  <AdminField label="CTA href">
                    <AdminInput
                      value={hero.ctaHref}
                      onChange={(e) =>
                        setHero({ ...hero, ctaHref: e.target.value })
                      }
                    />
                  </AdminField>
                </div>

                <div className="space-y-3 rounded-xl border border-[var(--admin-border)] p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Hero collage tiles (7 public slots)
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                      Matches the live Hero collage: 4 category stills + 3
                      preview videos. Empty slots keep automatic catalog
                      fallbacks. Layout and styling on the storefront stay
                      unchanged.
                    </p>
                  </div>

                  <AdminField label="1 · Viral Dance (category still)">
                    <HomepageEntityPicker
                      kind="product"
                      productTypeHint="VIDEO"
                      selectionMode="single"
                      selectedIds={
                        collage.viralDanceProductId
                          ? [collage.viralDanceProductId]
                          : []
                      }
                      onChange={(ids) =>
                        patchCollage({ viralDanceProductId: ids[0] ?? "" })
                      }
                      emptyHint="Leave empty for automatic video thumbnail."
                      addLabel="Choose Viral Dance tile"
                    />
                  </AdminField>

                  <AdminField
                    label={`2–4 · Preview videos (ordered, max ${HERO_COLLAGE_PREVIEW_MAX})`}
                  >
                    <HomepageEntityPicker
                      kind="product"
                      productTypeHint="VIDEO"
                      selectedIds={collage.previewVideoIds}
                      onChange={(ids) =>
                        patchCollage({
                          previewVideoIds: ids.slice(0, HERO_COLLAGE_PREVIEW_MAX),
                        })
                      }
                      emptyHint="Ordered left → center → right preview slots. Leave empty for automatic trending previews. Drag to reorder."
                      addLabel="Add preview videos"
                    />
                  </AdminField>

                  <AdminField label="5 · AI Images (category still / lower-left)">
                    <HomepageEntityPicker
                      kind="product"
                      productTypeHint="AI_IMAGE"
                      selectionMode="single"
                      selectedIds={
                        collage.aiImageProductId
                          ? [collage.aiImageProductId]
                          : []
                      }
                      onChange={(ids) =>
                        patchCollage({ aiImageProductId: ids[0] ?? "" })
                      }
                      emptyHint="Leave empty for automatic AI Image thumbnail. When empty, Featured Video may fill lower-left."
                      addLabel="Choose AI Images tile"
                    />
                  </AdminField>

                  <AdminField label="6 · Motion Control (category still)">
                    <HomepageEntityPicker
                      kind="product"
                      productTypeHint="VIDEO"
                      selectionMode="single"
                      selectedIds={
                        collage.motionControlProductId
                          ? [collage.motionControlProductId]
                          : []
                      }
                      onChange={(ids) =>
                        patchCollage({
                          motionControlProductId: ids[0] ?? "",
                        })
                      }
                      emptyHint="Leave empty for automatic video thumbnail."
                      addLabel="Choose Motion Control tile"
                    />
                  </AdminField>

                  <AdminField
                    label="7 · AI Tools (category still)"
                    hint="AI Tools catalog is excluded from this release. The storefront tile uses image/video fallbacks and links to Explore. collage.toolId is kept empty for schema compatibility."
                  >
                    <p className="rounded-xl border border-dashed border-[var(--admin-border)] px-3 py-2 text-[11px] text-[var(--admin-muted)]">
                      Tool picking unavailable — no Tools modules or database in
                      this KYC build.
                    </p>
                  </AdminField>
                </div>

                <AdminField label="Featured Video preference (separate)">
                  <HomepageEntityPicker
                    kind="product"
                    productTypeHint="VIDEO"
                    selectionMode="single"
                    selectedIds={
                      hero.featuredProductId ? [hero.featuredProductId] : []
                    }
                    onChange={(ids) =>
                      setHero((prev) =>
                        prev
                          ? { ...prev, featuredProductId: ids[0] ?? "" }
                          : prev,
                      )
                    }
                    emptyHint="Optional. Prefers the Featured Video still and can fill lower-left when AI Images has no src. Does not replace the 7 collage slots above."
                    addLabel="Choose featured video"
                  />
                </AdminField>

                <p className="rounded-xl border border-dashed border-[var(--admin-border)] px-3 py-2 text-[11px] leading-relaxed text-[var(--admin-muted)]">
                  Eyebrow and supporting copy are intentionally deferred. The
                  current hero layout only has a headline + collage + CTA;
                  those fields stay in persisted config for a future layout
                  that can show them without redesigning today&apos;s hero.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.copy.map((key) => (
                  <AdminField key={key} label={COPY_FIELD_LABELS[key]}>
                    {key === "description" ? (
                      <AdminTextarea
                        value={selected.copy?.[key] ?? ""}
                        onChange={(e) => patchCopy(key, e.target.value)}
                      />
                    ) : (
                      <AdminInput
                        value={selected.copy?.[key] ?? ""}
                        onChange={(e) => patchCopy(key, e.target.value)}
                      />
                    )}
                  </AdminField>
                ))}

                {defaultMaxItemsForSection(selected.id) != null &&
                (fields.content.includes("productIds") ||
                  fields.content.includes("collectionIds") ||
                  fields.content.includes("tickerEntries")) ? (
                  <AdminField
                    label="Max items on storefront"
                    hint={`Public section shows up to this many cards (default ${defaultMaxItemsForSection(selected.id)}). Extra curated IDs stay saved for later.`}
                  >
                    <AdminInput
                      type="number"
                      min={0}
                      max={24}
                      value={
                        selected.content?.maxItems ??
                        defaultMaxItemsForSection(selected.id) ??
                        0
                      }
                      onChange={(e) =>
                        patchMaxItems(Number(e.target.value) || 0)
                      }
                    />
                  </AdminField>
                ) : null}

                {fields.content.includes("productIds") ? (
                  <AdminField
                    label={`Selected lineup${
                      fields.productTypeHint && fields.productTypeHint !== "ANY"
                        ? ` (${fields.productTypeHint})`
                        : ""
                    }`}
                  >
                    <HomepageEntityPicker
                      kind="product"
                      productTypeHint={fields.productTypeHint ?? "ANY"}
                      selectedIds={selected.content?.productIds ?? []}
                      onChange={(ids) => setCuratedIds("productIds", ids)}
                      emptyHint={
                        fields.featuredMerchandising
                          ? "Leave empty for storefront fallbacks. Independent of Trending carousel picks. Drag to reorder. Missing catalog IDs stay listed."
                          : "Leave empty for storefront fallbacks. Selection order is preserved; drag to reorder. Missing catalog IDs stay listed."
                      }
                      addLabel={lineupAddLabel(selected.id)}
                    />
                  </AdminField>
                ) : null}

                {fields.content.includes("collectionIds") ? (
                  <AdminField label="Selected lineup (collections)">
                    <HomepageEntityPicker
                      kind="collection"
                      selectedIds={selected.content?.collectionIds ?? []}
                      onChange={(ids) => setCuratedIds("collectionIds", ids)}
                      emptyHint="Leave empty to prefer featured collections, then catalog order. Drag to reorder. Missing catalog IDs stay listed."
                      addLabel={lineupAddLabel(selected.id)}
                    />
                  </AdminField>
                ) : null}

                {selected.id === "ai-tools" ? (
                  <div className="space-y-3 rounded-xl border border-[var(--admin-border)] p-3">
                    <p className="text-sm font-semibold">AI Tools section</p>
                    <p className="text-[11px] text-[var(--admin-muted)]">
                      The AI Tools deals catalog is out of scope for the first
                      KYC release. Keep this section disabled (default). Enabling
                      it will not call Tools APIs — the storefront renders
                      nothing for this section id.
                    </p>
                  </div>
                ) : null}

                {fields.content.includes("tickerEntries") ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        Ticker items ({tickerEntries.length} total · drag to
                        reorder)
                      </p>
                      <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={addTickerEntry}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add item
                      </AdminButton>
                    </div>
                    <p className="text-[11px] text-[var(--admin-muted)]">
                      Show/hide the ticker with the section toggle. Disable or
                      remove items below; invalid destinations are skipped on
                      the storefront. Linked product picks are visual.
                    </p>
                    {[...tickerEntries]
                      .sort((a, b) => a.order - b.order)
                      .map((entry) => (
                        <div
                          key={entry.id}
                          draggable
                          onDragStart={() => setTickerDragId(entry.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            onTickerDropReorder(entry.id);
                          }}
                          onDragEnd={() => setTickerDragId(null)}
                          className={`space-y-2 rounded-xl border border-[var(--admin-border)] p-3 ${
                            tickerDragId === entry.id ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="cursor-grab text-[var(--admin-muted)] active:cursor-grabbing"
                              aria-hidden
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                aria-label="Move ticker item up"
                                onClick={() => moveTickerEntry(entry.id, -1)}
                              >
                                <ArrowUp className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                              </button>
                              <button
                                type="button"
                                aria-label="Move ticker item down"
                                onClick={() => moveTickerEntry(entry.id, 1)}
                              >
                                <ArrowDown className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                              </button>
                            </div>
                            <AdminToggle
                              checked={entry.enabled !== false}
                              onChange={(enabled) =>
                                patchTickerEntry(entry.id, { enabled })
                              }
                            />
                            <button
                              type="button"
                              aria-label="Remove ticker item"
                              className="ml-auto text-[var(--admin-muted)]"
                              onClick={() => removeTickerEntry(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <AdminField label="Label">
                            <AdminInput
                              value={entry.label}
                              onChange={(e) =>
                                patchTickerEntry(entry.id, {
                                  label: e.target.value,
                                })
                              }
                            />
                          </AdminField>
                          <AdminField label="Metric text">
                            <AdminInput
                              value={entry.metric}
                              onChange={(e) =>
                                patchTickerEntry(entry.id, {
                                  metric: e.target.value,
                                })
                              }
                            />
                          </AdminField>
                          <AdminField label="Destination href (optional)">
                            <AdminInput
                              value={entry.href ?? ""}
                              placeholder="/videos/slug or https://…"
                              onChange={(e) =>
                                patchTickerEntry(entry.id, {
                                  href: e.target.value,
                                })
                              }
                            />
                          </AdminField>
                          <AdminField label="Linked product (optional)">
                            <HomepageEntityPicker
                              kind="product"
                              productTypeHint="VIDEO"
                              selectionMode="single"
                              selectedIds={
                                entry.productId ? [entry.productId] : []
                              }
                              onChange={(ids) => {
                                const productId = ids[0];
                                const product = productId
                                  ? products.find((p) => p.id === productId)
                                  : undefined;
                                patchTickerEntry(entry.id, {
                                  productId: productId || undefined,
                                  ...(product &&
                                  (!entry.label ||
                                    entry.label === "New ticker item")
                                    ? { label: product.name }
                                    : {}),
                                });
                              }}
                              emptyHint="Optional. When set and href is empty, storefront links to /videos/{slug}."
                              addLabel="Link a video"
                            />
                          </AdminField>
                        </div>
                      ))}
                  </div>
                ) : null}

                {fields.copy.length === 0 && fields.content.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)]">
                    Visibility and order only for this section.
                  </p>
                ) : null}
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      <AdminSaveBar dirty={dirty} onSave={save} savingLabel="Save homepage" />
    </div>
  );
}
