import type {
  HomepageConfigDocument,
  HomepageHeroConfig,
  HomepageSection,
  HomepageSectionContent,
  HomepageSectionCopy,
  HomepageSectionId,
  HomepageTickerEntry,
} from "@/admin/types";
import { isAllowedSiteHref } from "@/catalog/siteContent";
import { trendingStripItems } from "@/data/conversion";

/** Canonical section order matching the redesigned homepage composition. */
export const HOMEPAGE_SECTION_IDS: readonly HomepageSectionId[] = [
  "hero",
  "trending",
  "trending-strip",
  "featured-videos",
  "images",
  "collections",
  "bundles",
  "ai-tools",
  "prompts",
  "why-pragvi",
  "final-cta",
] as const;

const SECTION_ID_SET = new Set<string>(HOMEPAGE_SECTION_IDS);

/**
 * Map pre–Stage 2 CMS section ids onto the live homepage composition.
 * `footer` is not a homepage section (site chrome) — dropped on normalize.
 */
export const LEGACY_HOMEPAGE_SECTION_MAP: Record<string, HomepageSectionId | null> =
  {
    hero: "hero",
    featured: "featured-videos",
    trending: "trending",
    collections: "collections",
    "creator-insight": "why-pragvi",
    promo: "final-cta",
    footer: null,
  };

/**
 * Canonical storefront hero headline + CTA (Admin → Homepage → Hero / homepageHero).
 * Keep DEFAULT_SECTION_COPY.hero aligned with these — section copy must not diverge.
 */
export const APPROVED_HOMEPAGE_HERO_HEADLINE =
  "Ready-to-Use AI Content for Social Media";
export const APPROVED_HOMEPAGE_HERO_CTA_TEXT = "Explore Marketplace";
export const APPROVED_HOMEPAGE_HERO_CTA_HREF = "/explore";

/** Exact legacy seed strings still present in some rhythm-admin-cms-v8 snapshots. */
export const LEGACY_SEED_HOMEPAGE_HERO_HEADLINE = "Moves that feel alive";
export const LEGACY_SEED_HOMEPAGE_HERO_CTA_TEXT = "Explore formats";

/** Default copy taken from the redesigned homepage components (preserve as CMS defaults). */
export const DEFAULT_SECTION_COPY: Record<
  HomepageSectionId,
  HomepageSectionCopy
> = {
  hero: {
    title: APPROVED_HOMEPAGE_HERO_HEADLINE,
    ctaLabel: APPROVED_HOMEPAGE_HERO_CTA_TEXT,
    ctaHref: APPROVED_HOMEPAGE_HERO_CTA_HREF,
  },
  trending: {
    eyebrow: "Marketplace picks",
    title: "AI dance videos for Reels & Shorts",
    description:
      "Browse ready-made social media motion — vertical clips you can post without a production crew.",
  },
  "trending-strip": {
    eyebrow: "From the catalog",
  },
  "featured-videos": {
    eyebrow: "Buy AI dance videos",
    title: "Ready-to-use AI videos for Instagram Reels & Shorts",
    description:
      "Vertical, post-ready motion for creators and social teams who want fresh Reels content without producing every clip in-house.",
    ctaLabel: "Shop AI dance videos",
    ctaHref: "/videos",
  },
  images: {
    eyebrow: "AI-generated images for creators",
    title: "Ready-to-use visuals for posts, ads & thumbnails",
    description:
      "Buy AI-generated images when you need fresh feed creatives without a photoshoot — built for Instagram, Shorts thumbnails, and campaign storytelling.",
    ctaLabel: "Browse AI images",
    ctaHref: "/images",
  },
  collections: {
    eyebrow: "Curated collections",
    title: "Editorial collections for niches, aesthetics & occasions",
    description:
      "Browse themed packs of ready-to-use viral-style content — then open each collection to shop the AI dance videos inside.",
    ctaLabel: "View all collections",
    ctaHref: "/collections",
  },
  bundles: {
    eyebrow: "Social media content bundles",
    title: "Complementary assets packaged for faster campaigns",
    description:
      "Group related creative assets together — prices and savings shown only when they exist on the live product. Perfect for Reels drops and client calendars.",
    ctaLabel: "Browse all bundles",
    ctaHref: "/bundles",
  },
  "ai-tools": {
    eyebrow: "More from PRAGVI",
    title: "Explore the creative catalog",
    description:
      "This section is reserved for a future release. In the KYC build it stays disabled and does not load an external tools catalog.",
    ctaLabel: "Explore catalog",
    ctaHref: "/explore",
  },
  prompts: {
    eyebrow: "AI prompts for social media content",
    title: "Ready-to-use prompts for better creative drafts",
    description:
      "Prompt packs for captions, visuals, and campaign concepts — so creators and agencies can brief tools faster and unlock full instructions after purchase.",
    ctaLabel: "Browse all prompts",
    ctaHref: "/prompts",
  },
  "why-pragvi": {
    eyebrow: "Why PRAGVI",
    title:
      "A marketplace for ready-made social media content — not another AI generator",
    description:
      "Built for Instagram creators, YouTube Shorts makers, influencers, theme pages, marketers, and teams who want fresher content ideas and more chances to earn reach — without guaranteeing virality.",
    ctaLabel: "Explore the marketplace",
    ctaHref: "/explore",
  },
  "final-cta": {
    eyebrow: "Start creating today",
    title: "Create content. Capture attention. Grow faster.",
    description:
      "Explore PRAGVI to buy AI dance videos for Instagram Reels, ready-made social media videos, AI images, and prompts — then publish more consistently without starting from a blank timeline.",
    ctaLabel: "Explore Marketplace",
    ctaHref: "/explore",
    secondaryCtaLabel: "Explore Collections",
    secondaryCtaHref: "/collections",
  },
};

const SECTION_LABELS: Record<HomepageSectionId, string> = {
  hero: "Hero",
  trending: "Trending carousel",
  "trending-strip": "Trending ticker",
  "featured-videos": "Featured dance videos",
  images: "Featured AI images",
  collections: "Collections showcase",
  bundles: "Featured creator bundles",
  "ai-tools": "AI tool deals",
  prompts: "Featured prompts",
  "why-pragvi": "Why PRAGVI",
  "final-cta": "Final CTA",
};

/** Sections whose productIds are featured merchandising (≠ trending carousel). */
export const FEATURED_MERCHANDISING_SECTION_IDS: readonly HomepageSectionId[] = [
  "featured-videos",
  "images",
  "prompts",
  "bundles",
] as const;

const DEFAULT_MAX_ITEMS: Partial<Record<HomepageSectionId, number>> = {
  trending: 7,
  "trending-strip": 8,
  "featured-videos": 8,
  images: 8,
  collections: 5,
  bundles: 5,
  prompts: 5,
};

/** Public card budget for a section (CMS hint + sectionMaxItems fallback). */
export function defaultMaxItemsForSection(
  id: HomepageSectionId,
): number | undefined {
  return DEFAULT_MAX_ITEMS[id];
}

/**
 * Default ticker rows for CMS empty state.
 * Labels only — seed play/engagement metrics are never published publicly.
 */
export const DEFAULT_TICKER_ENTRIES: HomepageTickerEntry[] =
  trendingStripItems.map((item, order) => ({
    id: item.id,
    label: item.label,
    metric: "",
    productId: item.videoId,
    order,
    enabled: true,
  }));

function defaultContentFor(
  id: HomepageSectionId,
): HomepageSectionContent | undefined {
  if (id === "trending-strip") {
    return {
      productIds: [],
      collectionIds: [],
      maxItems: DEFAULT_MAX_ITEMS[id],
      tickerEntries: structuredClone(DEFAULT_TICKER_ENTRIES),
    };
  }
  const maxItems = DEFAULT_MAX_ITEMS[id];
  if (maxItems == null) return undefined;
  return { productIds: [], collectionIds: [], maxItems };
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] =
  HOMEPAGE_SECTION_IDS.map((id, order) => ({
    id,
    label: SECTION_LABELS[id],
    // AI Tools storefront section stays in the schema for compat but is off
    // until a future release that ships the tools catalog.
    enabled: id !== "ai-tools",
    order,
    copy: { ...DEFAULT_SECTION_COPY[id] },
    content: defaultContentFor(id),
  }));

export const DEFAULT_HOMEPAGE_HERO_COLLAGE: HomepageHeroConfig["collage"] = {
  viralDanceProductId: "",
  aiImageProductId: "",
  motionControlProductId: "",
  toolId: "",
  previewVideoIds: [],
};

export const DEFAULT_HOMEPAGE_HERO: HomepageHeroConfig = {
  eyebrow: "",
  headline: APPROVED_HOMEPAGE_HERO_HEADLINE,
  supportingText: "",
  featuredProductId: "vid-002",
  ctaText: APPROVED_HOMEPAGE_HERO_CTA_TEXT,
  ctaHref: APPROVED_HOMEPAGE_HERO_CTA_HREF,
  collage: { ...DEFAULT_HOMEPAGE_HERO_COLLAGE },
};

export const HERO_COLLAGE_PREVIEW_MAX = 3;

export function normalizeHomepageHeroCollage(
  raw: unknown,
): HomepageHeroConfig["collage"] {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const str = (key: string) => {
    const v = record[key];
    return typeof v === "string" ? v.trim() : "";
  };
  const previewRaw = record.previewVideoIds;
  const previewVideoIds = Array.isArray(previewRaw)
    ? previewRaw
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
        .filter((id, index, all) => all.indexOf(id) === index)
        .slice(0, HERO_COLLAGE_PREVIEW_MAX)
    : [];
  return {
    viralDanceProductId: str("viralDanceProductId"),
    aiImageProductId: str("aiImageProductId"),
    motionControlProductId: str("motionControlProductId"),
    toolId: str("toolId"),
    previewVideoIds,
  };
}

/** True when any Hero collage tile has a manual catalog selection. */
export function isHomepageHeroCollageCurated(
  collage: HomepageHeroConfig["collage"] | null | undefined,
): boolean {
  if (!collage) return false;
  return Boolean(
    collage.viralDanceProductId ||
      collage.aiImageProductId ||
      collage.motionControlProductId ||
      collage.toolId ||
      collage.previewVideoIds.length > 0,
  );
}

/**
 * Narrow migration: only exact legacy seed headline/CTA → approved PRAGVI copy.
 * Custom admin values and all other homepageHero fields are preserved.
 */
export function migrateLegacyHomepageHeroCopy(
  hero: HomepageHeroConfig,
): HomepageHeroConfig {
  return {
    ...hero,
    headline:
      hero.headline === LEGACY_SEED_HOMEPAGE_HERO_HEADLINE
        ? APPROVED_HOMEPAGE_HERO_HEADLINE
        : hero.headline,
    ctaText:
      hero.ctaText === LEGACY_SEED_HOMEPAGE_HERO_CTA_TEXT
        ? APPROVED_HOMEPAGE_HERO_CTA_TEXT
        : hero.ctaText,
  };
}

/** True when raw CMS hero still carries exact legacy seed headline and/or CTA. */
export function homepageHeroNeedsLegacyCopyMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as Record<string, unknown>;
  return (
    record.headline === LEGACY_SEED_HOMEPAGE_HERO_HEADLINE ||
    record.ctaText === LEGACY_SEED_HOMEPAGE_HERO_CTA_TEXT
  );
}

export function isHomepageSectionId(value: unknown): value is HomepageSectionId {
  return typeof value === "string" && SECTION_ID_SET.has(value);
}

export function resolveHomepageSectionId(
  rawId: unknown,
): HomepageSectionId | null {
  if (typeof rawId !== "string") return null;
  if (isHomepageSectionId(rawId)) return rawId;
  if (Object.prototype.hasOwnProperty.call(LEGACY_HOMEPAGE_SECTION_MAP, rawId)) {
    return LEGACY_HOMEPAGE_SECTION_MAP[rawId] ?? null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

function mergeCopy(
  defaults: HomepageSectionCopy,
  saved?: HomepageSectionCopy | null,
): HomepageSectionCopy {
  if (!saved || typeof saved !== "object") return { ...defaults };
  const next: HomepageSectionCopy = { ...defaults };
  for (const key of [
    "eyebrow",
    "title",
    "description",
    "ctaLabel",
    "ctaHref",
    "secondaryCtaLabel",
    "secondaryCtaHref",
  ] as const) {
    const v = saved[key];
    if (typeof v === "string") next[key] = v;
  }
  return next;
}

function normalizeTickerEntries(
  raw: unknown,
  fallback: HomepageTickerEntry[],
): HomepageTickerEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return structuredClone(fallback);
  }
  const out: HomepageTickerEntry[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `ticker-${i}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const label = typeof record.label === "string" ? record.label : "";
    const metric = typeof record.metric === "string" ? record.metric : "";
    const href =
      typeof record.href === "string" && record.href.trim()
        ? record.href.trim()
        : undefined;
    const productId =
      typeof record.productId === "string" && record.productId.trim()
        ? record.productId.trim()
        : undefined;
    const order =
      typeof record.order === "number" && Number.isFinite(record.order)
        ? record.order
        : i;
    const enabled =
      typeof record.enabled === "boolean" ? record.enabled : true;
    out.push({
      id,
      label,
      metric,
      order,
      enabled,
      ...(href ? { href } : {}),
      ...(productId ? { productId } : {}),
    });
  }
  return out
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((entry, order) => ({ ...entry, order }));
}

function mergeContent(
  id: HomepageSectionId,
  saved?: HomepageSectionContent | null,
): HomepageSectionContent | undefined {
  const defaults = defaultContentFor(id);
  if (!defaults && (!saved || typeof saved !== "object")) return undefined;
  const base = defaults ?? { productIds: [], collectionIds: [] };
  if (!saved || typeof saved !== "object") {
    return {
      ...base,
      ...(id === "trending-strip"
        ? { tickerEntries: structuredClone(DEFAULT_TICKER_ENTRIES) }
        : {}),
    };
  }
  const maxItems =
    typeof saved.maxItems === "number" && Number.isFinite(saved.maxItems)
      ? Math.max(0, Math.floor(saved.maxItems))
      : base.maxItems;
  const next: HomepageSectionContent = {
    productIds: asStringArray(saved.productIds),
    collectionIds: asStringArray(saved.collectionIds),
    ...(maxItems != null ? { maxItems } : {}),
  };
  if (id === "trending-strip") {
    next.tickerEntries = normalizeTickerEntries(
      saved.tickerEntries,
      DEFAULT_TICKER_ENTRIES,
    );
  }
  return next;
}

type SavedHomepageSectionFields = {
  enabled?: boolean;
  order?: number;
  label?: string;
  copy?: HomepageSectionCopy;
  content?: HomepageSectionContent;
};

/**
 * Known order produced by the pre-fix normalize that mixed absolute legacy
 * `order` values with default orders for newly introduced sections. Persisted
 * full lists matching this sequence are migration artifacts, not intentional
 * admin reorders — restore canonical order while keeping copy/content/enabled.
 */
export const LEGACY_ORDER_MERGE_ARTIFACT: readonly HomepageSectionId[] = [
  "hero",
  "featured-videos",
  "trending",
  "trending-strip",
  "collections",
  "images",
  "why-pragvi",
  "final-cta",
  "bundles",
  "ai-tools",
  "prompts",
] as const;

/** Section ids introduced in the Stage 2 homepage composition (not in pre-CMS map). */
const STAGE2_ONLY_SECTION_IDS: ReadonlySet<HomepageSectionId> = new Set([
  "trending-strip",
  "images",
  "bundles",
  "ai-tools",
  "prompts",
]);

function canonicalIndex(id: HomepageSectionId): number {
  return HOMEPAGE_SECTION_IDS.indexOf(id);
}

function isLegacyPartialHomepageSave(savedIds: HomepageSectionId[]): boolean {
  if (savedIds.length === 0) return false;
  if (savedIds.length >= HOMEPAGE_SECTION_IDS.length) return false;
  // Pre–Stage 2 CMS never persisted Stage 2-only section ids.
  return savedIds.every((id) => !STAGE2_ONLY_SECTION_IDS.has(id));
}

/**
 * Resolve storefront/admin section order from saved CMS ids.
 * - Empty → canonical defaults.
 * - Pre–Stage 2 partial saves → canonical order (legacy absolute orders are not comparable).
 * - Known merge-artifact sequence → canonical order.
 * - Complete admin saves → preserve relative saved order.
 * - Other partial saves (include Stage 2 ids) → saved relative order + canonical insert.
 */
export function resolveHomepageSectionOrder(
  savedIds: HomepageSectionId[],
  savedOrderById: Map<HomepageSectionId, number | undefined>,
): HomepageSectionId[] {
  if (savedIds.length === 0) {
    return [...HOMEPAGE_SECTION_IDS];
  }

  const savedOrdered = [...savedIds].sort((a, b) => {
    const oa = savedOrderById.get(a);
    const ob = savedOrderById.get(b);
    const na =
      typeof oa === "number" && Number.isFinite(oa) ? oa : Number.POSITIVE_INFINITY;
    const nb =
      typeof ob === "number" && Number.isFinite(ob) ? ob : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return canonicalIndex(a) - canonicalIndex(b);
  });

  if (
    savedOrdered.length === LEGACY_ORDER_MERGE_ARTIFACT.length &&
    savedOrdered.every((id, i) => id === LEGACY_ORDER_MERGE_ARTIFACT[i])
  ) {
    return [...HOMEPAGE_SECTION_IDS];
  }

  if (isLegacyPartialHomepageSave(savedOrdered)) {
    return [...HOMEPAGE_SECTION_IDS];
  }

  // Complete set → trust relative saved order as intentional admin configuration.
  if (savedOrdered.length >= HOMEPAGE_SECTION_IDS.length) {
    const seen = new Set<HomepageSectionId>();
    const ordered: HomepageSectionId[] = [];
    for (const id of savedOrdered) {
      if (seen.has(id) || !isHomepageSectionId(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    for (const id of HOMEPAGE_SECTION_IDS) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    return ordered;
  }

  // Partial save that already includes Stage 2 sections: keep relative order,
  // insert any still-missing ids at canonical slots.
  const ordered = [...savedOrdered];
  for (const id of HOMEPAGE_SECTION_IDS) {
    if (ordered.includes(id)) continue;
    const target = canonicalIndex(id);
    let insertAt = ordered.length;
    for (let i = 0; i < ordered.length; i++) {
      if (canonicalIndex(ordered[i]!) > target) {
        insertAt = i;
        break;
      }
    }
    ordered.splice(insertAt, 0, id);
  }
  return ordered;
}

/**
 * Merge saved (possibly legacy) homepage sections with canonical defaults.
 * Never drops newly introduced sections; preserves enabled/copy/content.
 * Section order: saved relative order + canonical insert for missing ids
 * (does not blend absolute legacy order ints with default order ints).
 */
export function normalizeHomepageSections(raw: unknown): HomepageSection[] {
  const list = Array.isArray(raw) ? raw : [];
  const savedById = new Map<HomepageSectionId, SavedHomepageSectionFields>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = resolveHomepageSectionId(record.id);
    if (!id || savedById.has(id)) continue;
    savedById.set(id, {
      enabled: typeof record.enabled === "boolean" ? record.enabled : undefined,
      order: typeof record.order === "number" ? record.order : undefined,
      label: typeof record.label === "string" ? record.label : undefined,
      copy:
        record.copy && typeof record.copy === "object"
          ? (record.copy as HomepageSectionCopy)
          : undefined,
      content:
        record.content && typeof record.content === "object"
          ? (record.content as HomepageSectionContent)
          : undefined,
    });
  }

  if (savedById.size === 0) {
    return structuredClone(DEFAULT_HOMEPAGE_SECTIONS);
  }

  const orderById = new Map<HomepageSectionId, number | undefined>();
  for (const [id, saved] of savedById) {
    orderById.set(id, saved.order);
  }
  const orderedIds = resolveHomepageSectionOrder(
    [...savedById.keys()],
    orderById,
  );

  const defById = new Map(
    DEFAULT_HOMEPAGE_SECTIONS.map((def) => [def.id, def] as const),
  );

  const merged = orderedIds.map((id, order) => {
    const def = defById.get(id) ?? DEFAULT_HOMEPAGE_SECTIONS[0]!;
    const saved = savedById.get(id);
    if (!saved) {
      return { ...structuredClone(def), order };
    }
    return {
      id,
      label: saved.label?.trim() || def.label,
      enabled: typeof saved.enabled === "boolean" ? saved.enabled : def.enabled,
      order,
      copy: mergeCopy(def.copy ?? {}, saved.copy),
      content: mergeContent(id, saved.content),
    } satisfies HomepageSection;
  });

  return reindexHomepageSections(merged);
}

export function normalizeHomepageHero(raw: unknown): HomepageHeroConfig {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const str = (key: keyof HomepageHeroConfig, fallback: string) => {
    const v = record[key];
    return typeof v === "string" ? v : fallback;
  };
  // homepageHero is the single source of truth for live hero headline/CTA.
  // Do not pull from homepageSections[hero].copy here.
  const normalized: HomepageHeroConfig = {
    eyebrow: str("eyebrow", DEFAULT_HOMEPAGE_HERO.eyebrow),
    headline: str("headline", DEFAULT_HOMEPAGE_HERO.headline),
    supportingText: str("supportingText", DEFAULT_HOMEPAGE_HERO.supportingText),
    featuredProductId: str(
      "featuredProductId",
      DEFAULT_HOMEPAGE_HERO.featuredProductId,
    ),
    ctaText: str("ctaText", DEFAULT_HOMEPAGE_HERO.ctaText),
    ctaHref: str("ctaHref", DEFAULT_HOMEPAGE_HERO.ctaHref),
    collage: normalizeHomepageHeroCollage(record.collage),
  };
  return migrateLegacyHomepageHeroCopy(normalized);
}

export function reindexHomepageSections(
  sections: HomepageSection[],
): HomepageSection[] {
  return [...sections]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((section, order) => ({ ...section, order }));
}

export function getOrderedEnabledSections(
  sections: HomepageSection[],
): HomepageSection[] {
  return reindexHomepageSections(sections).filter((s) => s.enabled);
}

export function sectionCopy(
  section: HomepageSection | undefined,
  id: HomepageSectionId,
): HomepageSectionCopy {
  return mergeCopy(DEFAULT_SECTION_COPY[id], section?.copy);
}

export function sectionMaxItems(
  section: HomepageSection | undefined,
  id: HomepageSectionId,
  fallback: number,
): number {
  const max = section?.content?.maxItems;
  if (typeof max === "number" && Number.isFinite(max) && max >= 0) {
    return Math.floor(max);
  }
  return DEFAULT_MAX_ITEMS[id] ?? fallback;
}

/**
 * Prefer explicit curated ids (skipping missing/duplicate refs). When
 * curation is empty or yields nothing, use the provided fallback list.
 * Order of curatedIds is preserved.
 */
export function resolveCuratedById<T extends { id: string }>(
  all: T[],
  curatedIds: string[] | undefined,
  fallback: T[],
  maxItems: number,
): T[] {
  const limit = Math.max(0, maxItems);
  if (limit === 0) return [];

  const byId = new Map(all.map((item) => [item.id, item]));
  const ids = asStringArray(curatedIds);
  if (ids.length > 0) {
    const picked: T[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      const item = byId.get(id);
      if (!item) continue;
      seen.add(id);
      picked.push(item);
      if (picked.length >= limit) break;
    }
    if (picked.length > 0) return picked;
  }

  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of fallback) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Featured merchandising resolver — same rules as resolveCuratedById, kept
 * as a named API so callers never reuse trending picks by accident.
 */
export function resolveFeaturedSelection<T extends { id: string }>(
  eligibleCatalog: T[],
  featuredIds: string[] | undefined,
  fallback: T[],
  maxItems: number,
): T[] {
  return resolveCuratedById(eligibleCatalog, featuredIds, fallback, maxItems);
}

export type ResolvedTickerItem = {
  id: string;
  label: string;
  metric: string;
  href: string;
};

/** Same allowlist as Site Content nav/footer — blocks /admin, /api, //evil, etc. */
function isSafeTickerHref(href: string): boolean {
  return isAllowedSiteHref(href);
}

/**
 * Resolve ticker entries for storefront. Skips disabled rows, empty labels,
 * and destinations that cannot be validated. Falls back to seed entries when
 * CMS list is empty after filtering.
 */
export function resolveTickerEntries(
  entries: HomepageTickerEntry[] | undefined,
  products: Array<{ id: string; slug: string }>,
  options: { allowSeedFallback?: boolean } = {},
): ResolvedTickerItem[] {
  const allowSeedFallback = options.allowSeedFallback !== false;
  const byProductId = new Map(products.map((p) => [p.id, p]));
  const hasExplicitEntries = Array.isArray(entries) && entries.length > 0;
  const source = hasExplicitEntries
    ? [...entries!].sort((a, b) => a.order - b.order)
    : structuredClone(DEFAULT_TICKER_ENTRIES);

  const resolved: ResolvedTickerItem[] = [];
  const seen = new Set<string>();

  for (const entry of source) {
    if (entry.enabled === false) continue;
    const label = entry.label?.trim() ?? "";
    if (!label) continue;

    let href = entry.href?.trim() ?? "";
    if (!href && entry.productId) {
      const product = byProductId.get(entry.productId);
      if (!product?.slug) continue;
      href = `/videos/${product.slug}`;
    }
    if (!isSafeTickerHref(href)) continue;

    const id = entry.id || `ticker-${resolved.length}`;
    if (seen.has(id)) continue;
    seen.add(id);

    resolved.push({
      id,
      label,
      metric: entry.metric?.trim() ?? "",
      href,
    });
  }

  if (resolved.length > 0) return resolved;
  // Explicit CMS rows that all failed validation → hide ticker (no seed fill).
  if (hasExplicitEntries) return [];
  if (!allowSeedFallback) return [];
  return resolveTickerEntries(DEFAULT_TICKER_ENTRIES, products, {
    allowSeedFallback: false,
  });
}

/** Move a curated id within an ordered list (admin reorder). */
export function moveCuratedId(
  ids: string[],
  id: string,
  direction: -1 | 1,
): string[] {
  const next = [...ids];
  const index = next.indexOf(id);
  if (index < 0) return next;
  const j = index + direction;
  if (j < 0 || j >= next.length) return next;
  const tmp = next[index]!;
  next[index] = next[j]!;
  next[j] = tmp;
  return next;
}

export function toHomepageConfigDocument(
  sections: HomepageSection[],
  hero: HomepageHeroConfig,
): HomepageConfigDocument {
  return {
    version: 1,
    sections: normalizeHomepageSections(sections),
    hero: normalizeHomepageHero(hero),
  };
}

export function fromHomepageConfigDocument(
  doc: unknown,
): { sections: HomepageSection[]; hero: HomepageHeroConfig } {
  const record =
    doc && typeof doc === "object" ? (doc as Record<string, unknown>) : {};
  return {
    sections: normalizeHomepageSections(record.sections),
    hero: normalizeHomepageHero(record.hero),
  };
}
