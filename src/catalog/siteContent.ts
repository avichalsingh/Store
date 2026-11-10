/**
 * Stage 4 — Navigation, footer, page copy, promo CTAs, and badge labels.
 * Local AdminProvider persistence only (rhythm-admin-cms-v8). No DB table.
 */

export type SiteNavItem = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  order: number;
};

export type SiteNavConfig = {
  primary: SiteNavItem[];
  more: SiteNavItem[];
  moreLabel: string;
};

export type SiteFooterLink = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  order: number;
};

export type SiteFooterGroup = {
  id: string;
  title: string;
  links: SiteFooterLink[];
};

export type SiteSocialLink = {
  id: "instagram" | "youtube" | "x";
  label: string;
  href: string;
  enabled: boolean;
};

export type SiteFooterConfig = {
  tagline: string;
  followLabel: string;
  copyright: string;
  secondaryLine: string;
  social: SiteSocialLink[];
  groups: SiteFooterGroup[];
};

export type SiteFaqItem = {
  id: string;
  question: string;
  answer: string;
  enabled: boolean;
  order: number;
};

export type SiteLegalSection = {
  id: "faq" | "licenses" | "terms" | "privacy";
  heading: string;
  /** Plain text body (legacy single-block). Used when FAQ list is empty for faq. */
  body: string;
  enabled: boolean;
  order: number;
};

export type SiteAboutConfig = {
  eyebrow: string;
  title: string;
  intro: string;
  faqItems: SiteFaqItem[];
  sections: SiteLegalSection[];
};

export type SitePromoCta = {
  id: "early-access" | "newsletter";
  enabled: boolean;
  eyebrow?: string;
  title: string;
  description: string;
  ctaLabel: string;
  /** Optional destination; empty keeps email-form CTA behavior. */
  ctaHref?: string;
  footnote?: string;
  successMessage?: string;
};

export type SiteBadgeTone = "accent" | "neutral" | "soft";

export type SiteBadgeLabel = {
  id: "trending" | "new" | "featured" | "popular" | "limited";
  text: string;
  enabled: boolean;
  tone: SiteBadgeTone;
};

export type SiteContentConfig = {
  version: 1;
  navigation: SiteNavConfig;
  footer: SiteFooterConfig;
  about: SiteAboutConfig;
  promoCtas: SitePromoCta[];
  badges: SiteBadgeLabel[];
};

/** Public catalog routes allowed as CMS navigation destinations. */
const ALLOWED_INTERNAL_PATHS = [
  "/",
  "/explore",
  "/videos",
  "/images",
  "/prompts",
  "/characters",
  "/collections",
  "/captions",
  "/bundles",
  "/about",
  "/account",
  "/checkout",
  "/signin",
  "/hashtags",
  "/privacy",
  "/terms",
  "/refunds",
  "/delivery",
  "/contact",
] as const;

const BLOCKED_PREFIXES = ["/admin", "/api", "/library"];

export function isAllowedSiteHref(href: unknown): boolean {
  if (typeof href !== "string") return false;
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#") return false;

  // Protocol-relative URLs (//evil.example) must not be treated as internal paths.
  if (trimmed.startsWith("//")) return false;

  if (trimmed.startsWith("/")) {
    const path = trimmed.split("?")[0]!.split("#")[0]!;
    if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      return false;
    }
    return ALLOWED_INTERNAL_PATHS.some((allowed) => {
      // Exact "/" only — `${"/"}/` would incorrectly match "//…".
      if (allowed === "/") return path === "/";
      return path === allowed || path.startsWith(`${allowed}/`);
    });
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Social links may be empty/# (hidden) or http(s). */
export function isAllowedSocialHref(href: unknown): boolean {
  if (typeof href !== "string") return false;
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#") return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asOrder(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : fallback;
}

function reindexItems<T extends { order: number }>(items: T[]): T[] {
  return [...items]
    .sort((a, b) => a.order - b.order || 0)
    .map((item, order) => ({ ...item, order }));
}

export const DEFAULT_SITE_NAVIGATION: SiteNavConfig = {
  moreLabel: "More",
  primary: [
    { id: "nav-explore", label: "Explore", href: "/explore", enabled: true, order: 0 },
    { id: "nav-videos", label: "Viral Dance Videos", href: "/videos", enabled: true, order: 1 },
    { id: "nav-images", label: "AI Images", href: "/images", enabled: true, order: 2 },
    { id: "nav-tools", label: "AI Tools", href: "/explore", enabled: false, order: 3 },
    { id: "nav-prompts", label: "Prompts", href: "/prompts", enabled: true, order: 4 },
  ],
  more: [
    { id: "nav-characters", label: "Characters", href: "/characters", enabled: true, order: 0 },
    { id: "nav-collections", label: "Collections", href: "/collections", enabled: true, order: 1 },
    { id: "nav-captions", label: "Caption Packs", href: "/captions", enabled: true, order: 2 },
    { id: "nav-bundles", label: "Bundles", href: "/bundles", enabled: true, order: 3 },
    { id: "nav-about", label: "About", href: "/about", enabled: true, order: 4 },
  ],
};

export const DEFAULT_SITE_FOOTER: SiteFooterConfig = {
  tagline:
    "Buy AI dance videos, AI images for social media, prompts, and creator-ready digital assets — a premium marketplace for Reels, Shorts, and campaigns.",
  followLabel: "Follow us",
  copyright: "© {year} PRAGVI. All rights reserved.",
  secondaryLine: "Digital content · Instant delivery",
  social: [
    { id: "instagram", label: "Instagram (placeholder)", href: "", enabled: false },
    { id: "youtube", label: "YouTube (placeholder)", href: "", enabled: false },
    { id: "x", label: "X (placeholder)", href: "", enabled: false },
  ],
  groups: [
    {
      id: "explore",
      title: "Explore",
      links: [
        { id: "f-explore", label: "Explore", href: "/explore", enabled: true, order: 0 },
        { id: "f-videos", label: "AI Dance Videos", href: "/videos", enabled: true, order: 1 },
        { id: "f-images", label: "AI Images", href: "/images", enabled: true, order: 2 },
        { id: "f-tools", label: "AI Tools", href: "/explore", enabled: false, order: 3 },
        { id: "f-prompts", label: "Prompts", href: "/prompts", enabled: true, order: 4 },
      ],
    },
    {
      id: "support",
      title: "Support",
      links: [
        { id: "f-about", label: "About", href: "/about", enabled: true, order: 0 },
        { id: "f-account", label: "Account & Library", href: "/account", enabled: true, order: 1 },
        { id: "f-checkout", label: "Checkout", href: "/checkout", enabled: true, order: 2 },
        { id: "f-contact", label: "Contact", href: "/contact", enabled: true, order: 3 },
        { id: "f-faq", label: "FAQ", href: "/about#faq", enabled: true, order: 4 },
      ],
    },
    {
      id: "legal",
      title: "Legal",
      links: [
        { id: "f-terms", label: "Terms", href: "/terms", enabled: true, order: 0 },
        { id: "f-privacy", label: "Privacy", href: "/privacy", enabled: true, order: 1 },
        { id: "f-refunds", label: "Refunds", href: "/refunds", enabled: true, order: 2 },
        { id: "f-delivery", label: "Delivery", href: "/delivery", enabled: true, order: 3 },
        { id: "f-licenses", label: "Licenses", href: "/about#licenses", enabled: true, order: 4 },
      ],
    },
  ],
};

export const DEFAULT_SITE_ABOUT: SiteAboutConfig = {
  eyebrow: "About",
  title: "Create more. Imagine beyond.",
  intro:
    "PRAGVI is a premium creative marketplace for AI dance videos, images, prompts, and related digital assets. It is operated as an individual, home-based business under the PRAGVI brand and trading name — not as a separately registered company on these pages. Browse the catalogue, preview what inspires you, and unlock ready-to-use creative assets after purchase. Customer support: support@pragvi.com.",
  faqItems: [
    {
      id: "faq-library",
      question: "Where do my purchases appear?",
      answer:
        "After payment is successfully verified, entitled products appear in your signed-in Account / Library. Access depends on product type (for example downloadable video masters or in-account content). See the Digital Product Delivery Policy.",
      enabled: true,
      order: 0,
    },
    {
      id: "faq-refunds",
      question: "Can I get a refund?",
      answer:
        "PRAGVI uses a strict digital-product approach: change-of-mind refunds are not offered after successful digital delivery, subject to applicable law. Failed delivery, duplicate charges, defective files, material misdescription, and unauthorised payments are reviewed under the Refund and Cancellation Policy.",
      enabled: true,
      order: 1,
    },
  ],
  sections: [
    {
      id: "faq",
      heading: "FAQ",
      body: "After payment is successfully verified, entitled products appear in your signed-in Account / Library. Access depends on product type.",
      enabled: true,
      order: 0,
    },
    {
      id: "licenses",
      heading: "Licenses",
      body: "Unless a product page clearly states otherwise, a standard purchase grants a personal, non-commercial licence only. You do not buy copyright ownership of the underlying work. Resale, redistribution, sublicensing, file sharing, and repackaging are not allowed. Commercial or extended licences are not offered at this time.",
      enabled: true,
      order: 1,
    },
    {
      id: "terms",
      heading: "Terms",
      body: "Full Terms & Conditions are at /terms. Proprietor legal name is confirmed (Avichal Prakash). Address disclosure and jurisdiction fields stay marked until confirmed.",
      enabled: true,
      order: 2,
    },
    {
      id: "privacy",
      heading: "Privacy",
      body: "Our Privacy Policy is at /privacy. For privacy requests, email support@pragvi.com.",
      enabled: true,
      order: 3,
    },
  ],
};

export const DEFAULT_SITE_PROMO_CTAS: SitePromoCta[] = [
  {
    id: "early-access",
    enabled: true,
    eyebrow: "Don't miss the drop",
    title: "Don't miss the next move.",
    description:
      "New videos. New images. New prompts. Get early access to new releases and launch pricing.",
    ctaLabel: "Get Early Access",
    footnote: "No spam. Just new drops worth checking out.",
    successMessage: "You're on the early-access list.",
  },
  {
    id: "newsletter",
    enabled: true,
    title: "New characters are always learning new moves.",
    description:
      "Join for release drops, exclusive collections, and early access to limited creator packs.",
    ctaLabel: "Join waitlist",
    successMessage: "You're on the list. We'll be in touch.",
  },
];

export const DEFAULT_SITE_BADGES: SiteBadgeLabel[] = [
  { id: "trending", text: "Trending", enabled: true, tone: "accent" },
  { id: "new", text: "New", enabled: true, tone: "neutral" },
  { id: "featured", text: "Featured", enabled: true, tone: "accent" },
  { id: "popular", text: "Popular", enabled: true, tone: "accent" },
  { id: "limited", text: "Limited", enabled: true, tone: "soft" },
];

export const DEFAULT_SITE_CONTENT: SiteContentConfig = {
  version: 1,
  navigation: structuredClone(DEFAULT_SITE_NAVIGATION),
  footer: structuredClone(DEFAULT_SITE_FOOTER),
  about: structuredClone(DEFAULT_SITE_ABOUT),
  promoCtas: structuredClone(DEFAULT_SITE_PROMO_CTAS),
  badges: structuredClone(DEFAULT_SITE_BADGES),
};

function normalizeNavItem(
  raw: unknown,
  fallback: SiteNavItem,
  index: number,
): SiteNavItem | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const href = asString(record.href, fallback.href).trim();
  const label = asString(record.label, fallback.label).trim();
  if (!label) return null;
  return {
    id: asString(record.id, fallback.id) || `nav-${index}`,
    label,
    href: isAllowedSiteHref(href) ? href : fallback.href,
    enabled: asBool(record.enabled, fallback.enabled),
    order: asOrder(record.order, index),
  };
}

function normalizeNavList(
  raw: unknown,
  defaults: SiteNavItem[],
): SiteNavItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return structuredClone(defaults);
  }
  const out: SiteNavItem[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const fallback = defaults[Math.min(index, defaults.length - 1)] ?? defaults[0]!;
    const normalized = normalizeNavItem(item, fallback, index);
    if (!normalized || seen.has(normalized.id)) return;
    seen.add(normalized.id);
    out.push(normalized);
  });
  return out.length > 0 ? reindexItems(out) : structuredClone(defaults);
}

function normalizeFooterLink(
  raw: unknown,
  fallback: SiteFooterLink,
  index: number,
): SiteFooterLink {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const href = asString(record.href, fallback.href).trim();
  return {
    id: asString(record.id, fallback.id) || `flink-${index}`,
    label: asString(record.label, fallback.label) || fallback.label,
    href: isAllowedSiteHref(href) ? href : fallback.href,
    enabled: asBool(record.enabled, fallback.enabled),
    order: asOrder(record.order, index),
  };
}

function normalizeFooter(raw: unknown): SiteFooterConfig {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const defaults = DEFAULT_SITE_FOOTER;

  const socialDefaults = defaults.social;
  const socialRaw = Array.isArray(record.social) ? record.social : [];
  const social: SiteSocialLink[] = socialDefaults.map((def, i) => {
    const item =
      socialRaw.find(
        (s) =>
          s &&
          typeof s === "object" &&
          (s as { id?: string }).id === def.id,
      ) ?? socialRaw[i];
    const r =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
    const href = asString(r.href, def.href).trim();
    return {
      id: def.id,
      label: asString(r.label, def.label) || def.label,
      href: href === "#" ? "" : href,
      enabled: asBool(r.enabled, Boolean(href && href !== "#")),
    };
  });

  const groupsRaw = Array.isArray(record.groups) ? record.groups : [];
  const groups: SiteFooterGroup[] = defaults.groups.map((def, gi) => {
    const g =
      groupsRaw.find(
        (x) =>
          x &&
          typeof x === "object" &&
          (x as { id?: string }).id === def.id,
      ) ?? groupsRaw[gi];
    const gr =
      g && typeof g === "object" ? (g as Record<string, unknown>) : {};
    const linksRaw = Array.isArray(gr.links) ? gr.links : [];
    const links =
      linksRaw.length > 0
        ? (() => {
            // Prefer id-stable matching so additive default links keep correct hrefs.
            const byId = new Map(
              def.links.map((d) => [d.id, d] as const),
            );
            const normalized: SiteFooterLink[] = [];
            const seen = new Set<string>();
            linksRaw.forEach((link, li) => {
              const record =
                link && typeof link === "object"
                  ? (link as Record<string, unknown>)
                  : {};
              const rawId = asString(record.id, "").trim();
              const fallback =
                (rawId && byId.get(rawId)) ||
                def.links[Math.min(li, def.links.length - 1)] ||
                def.links[0]!;
              const next = normalizeFooterLink(link, fallback, li);
              if (seen.has(next.id)) return;
              // Migrate legacy about-hash legal hrefs to dedicated policy routes.
              const defLink = byId.get(next.id);
              if (
                defLink &&
                (next.id === "f-terms" ||
                  next.id === "f-privacy" ||
                  next.id === "f-refunds" ||
                  next.id === "f-delivery" ||
                  next.id === "f-contact") &&
                (next.href.startsWith("/about#") || !next.href.trim())
              ) {
                next.href = defLink.href;
                if (!next.label.trim()) next.label = defLink.label;
              }
              seen.add(next.id);
              normalized.push(next);
            });
            for (const defLink of def.links) {
              if (!seen.has(defLink.id)) {
                normalized.push(structuredClone(defLink));
                seen.add(defLink.id);
              }
            }
            return reindexItems(normalized);
          })()
        : structuredClone(def.links);
    return {
      id: def.id,
      title: asString(gr.title, def.title) || def.title,
      links,
    };
  });

  return {
    tagline: asString(record.tagline, defaults.tagline) || defaults.tagline,
    followLabel:
      asString(record.followLabel, defaults.followLabel) || defaults.followLabel,
    copyright:
      asString(record.copyright, defaults.copyright) || defaults.copyright,
    secondaryLine:
      asString(record.secondaryLine, defaults.secondaryLine) ||
      defaults.secondaryLine,
    social,
    groups,
  };
}

function normalizeAbout(raw: unknown): SiteAboutConfig {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const defaults = DEFAULT_SITE_ABOUT;

  const faqRaw = Array.isArray(record.faqItems) ? record.faqItems : [];
  const faqItems: SiteFaqItem[] =
    faqRaw.length > 0
      ? reindexItems(
          faqRaw
            .map((item, i) => {
              if (!item || typeof item !== "object") return null;
              const r = item as Record<string, unknown>;
              const question = asString(r.question, "").trim();
              const answer = asString(r.answer, "").trim();
              if (!question && !answer) return null;
              return {
                id: asString(r.id, `faq-${i}`) || `faq-${i}`,
                question: question || `Question ${i + 1}`,
                answer,
                enabled: asBool(r.enabled, true),
                order: asOrder(r.order, i),
              } satisfies SiteFaqItem;
            })
            .filter((x): x is SiteFaqItem => Boolean(x)),
        )
      : structuredClone(defaults.faqItems);

  const sectionsRaw = Array.isArray(record.sections) ? record.sections : [];
  const sections: SiteLegalSection[] = defaults.sections.map((def, i) => {
    const found =
      sectionsRaw.find(
        (s) =>
          s &&
          typeof s === "object" &&
          (s as { id?: string }).id === def.id,
      ) ?? sectionsRaw[i];
    const r =
      found && typeof found === "object"
        ? (found as Record<string, unknown>)
        : {};
    return {
      id: def.id,
      heading: asString(r.heading, def.heading) || def.heading,
      body: asString(r.body, def.body),
      enabled: asBool(r.enabled, def.enabled),
      order: asOrder(r.order, def.order),
    };
  });

  return {
    eyebrow: asString(record.eyebrow, defaults.eyebrow) || defaults.eyebrow,
    title: asString(record.title, defaults.title) || defaults.title,
    intro: asString(record.intro, defaults.intro) || defaults.intro,
    faqItems,
    sections: reindexItems(sections),
  };
}

const BADGE_TONES: SiteBadgeTone[] = ["accent", "neutral", "soft"];

function normalizeBadges(raw: unknown): SiteBadgeLabel[] {
  const list = Array.isArray(raw) ? raw : [];
  return DEFAULT_SITE_BADGES.map((def) => {
    const found = list.find(
      (b) =>
        b && typeof b === "object" && (b as { id?: string }).id === def.id,
    );
    const r =
      found && typeof found === "object"
        ? (found as Record<string, unknown>)
        : {};
    const toneRaw = asString(r.tone, def.tone);
    const tone = BADGE_TONES.includes(toneRaw as SiteBadgeTone)
      ? (toneRaw as SiteBadgeTone)
      : def.tone;
    return {
      id: def.id,
      text: asString(r.text, def.text).trim() || def.text,
      enabled: asBool(r.enabled, def.enabled),
      tone,
    };
  });
}

function normalizePromoCtas(raw: unknown): SitePromoCta[] {
  const list = Array.isArray(raw) ? raw : [];
  return DEFAULT_SITE_PROMO_CTAS.map((def) => {
    const found = list.find(
      (c) =>
        c && typeof c === "object" && (c as { id?: string }).id === def.id,
    );
    const r =
      found && typeof found === "object"
        ? (found as Record<string, unknown>)
        : {};
    const ctaHref = asString(r.ctaHref, def.ctaHref ?? "").trim();
    return {
      id: def.id,
      enabled: asBool(r.enabled, def.enabled),
      eyebrow: asString(r.eyebrow, def.eyebrow ?? ""),
      title: asString(r.title, def.title) || def.title,
      description: asString(r.description, def.description) || def.description,
      ctaLabel: asString(r.ctaLabel, def.ctaLabel) || def.ctaLabel,
      ctaHref:
        ctaHref && isAllowedSiteHref(ctaHref) ? ctaHref : def.ctaHref ?? "",
      footnote: asString(r.footnote, def.footnote ?? ""),
      successMessage:
        asString(r.successMessage, def.successMessage ?? "") ||
        def.successMessage,
    };
  });
}

export function normalizeSiteContent(raw: unknown): SiteContentConfig {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const navRaw =
    record.navigation && typeof record.navigation === "object"
      ? (record.navigation as Record<string, unknown>)
      : {};

  return {
    version: 1,
    navigation: {
      moreLabel:
        asString(navRaw.moreLabel, DEFAULT_SITE_NAVIGATION.moreLabel) ||
        DEFAULT_SITE_NAVIGATION.moreLabel,
      primary: normalizeNavList(navRaw.primary, DEFAULT_SITE_NAVIGATION.primary),
      more: normalizeNavList(navRaw.more, DEFAULT_SITE_NAVIGATION.more),
    },
    footer: normalizeFooter(record.footer),
    about: normalizeAbout(record.about),
    promoCtas: normalizePromoCtas(record.promoCtas),
    badges: normalizeBadges(record.badges),
  };
}

export function getEnabledNavItems(items: SiteNavItem[]): SiteNavItem[] {
  return reindexItems(items.filter((i) => i.enabled && isAllowedSiteHref(i.href)));
}

export function getEnabledFooterLinks(links: SiteFooterLink[]): SiteFooterLink[] {
  return reindexItems(
    links.filter(
      (l) => l.enabled && l.label.trim() && isAllowedSiteHref(l.href),
    ),
  );
}

export function getVisibleSocialLinks(
  social: SiteSocialLink[],
): SiteSocialLink[] {
  return social.filter(
    (s) => s.enabled && isAllowedSocialHref(s.href),
  );
}

export function formatCopyright(template: string, year = new Date().getFullYear()): string {
  return template.replace(/\{year\}/g, String(year));
}

export function getBadgeLabel(
  badges: SiteBadgeLabel[],
  id: SiteBadgeLabel["id"],
): SiteBadgeLabel | null {
  const badge = badges.find((b) => b.id === id);
  if (!badge || !badge.enabled || !badge.text.trim()) return null;
  return badge;
}

export function getPromoCta(
  promos: SitePromoCta[],
  id: SitePromoCta["id"],
): SitePromoCta | null {
  const promo = promos.find((p) => p.id === id);
  if (!promo || !promo.enabled) return null;
  return promo;
}
