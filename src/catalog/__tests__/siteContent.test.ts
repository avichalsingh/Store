import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_SITE_ABOUT,
  DEFAULT_SITE_BADGES,
  DEFAULT_SITE_CONTENT,
  DEFAULT_SITE_FOOTER,
  DEFAULT_SITE_NAVIGATION,
  DEFAULT_SITE_PROMO_CTAS,
  formatCopyright,
  getBadgeLabel,
  getEnabledFooterLinks,
  getEnabledNavItems,
  getPromoCta,
  getVisibleSocialLinks,
  isAllowedSiteHref,
  isAllowedSocialHref,
  normalizeSiteContent,
  type SiteContentConfig,
  type SiteNavItem,
} from "@/catalog/siteContent";

describe("siteContent URL validation", () => {
  it("allows public internal routes and http(s)", () => {
    assert.equal(isAllowedSiteHref("/explore"), true);
    assert.equal(isAllowedSiteHref("/videos/slug"), true);
    assert.equal(isAllowedSiteHref("/about#faq"), true);
    assert.equal(isAllowedSiteHref("/privacy"), true);
    assert.equal(isAllowedSiteHref("/terms"), true);
    assert.equal(isAllowedSiteHref("/refunds"), true);
    assert.equal(isAllowedSiteHref("/delivery"), true);
    assert.equal(isAllowedSiteHref("/contact"), true);
    assert.equal(isAllowedSiteHref("https://example.com/x"), true);
    assert.equal(isAllowedSiteHref("http://example.com"), true);
  });

  it("blocks admin/api/library and invalid values", () => {
    assert.equal(isAllowedSiteHref("/admin"), false);
    assert.equal(isAllowedSiteHref("/admin/products"), false);
    assert.equal(isAllowedSiteHref("/api/catalog"), false);
    assert.equal(isAllowedSiteHref("/library"), false);
    assert.equal(isAllowedSiteHref("//evil.example"), false);
    assert.equal(isAllowedSiteHref("#"), false);
    assert.equal(isAllowedSiteHref(""), false);
    assert.equal(isAllowedSiteHref("javascript:alert(1)"), false);
    assert.equal(isAllowedSiteHref("ftp://x"), false);
  });

  it("validates social links", () => {
    assert.equal(isAllowedSocialHref("https://instagram.com/x"), true);
    assert.equal(isAllowedSocialHref("#"), false);
    assert.equal(isAllowedSocialHref(""), false);
    assert.equal(isAllowedSocialHref("/explore"), false);
  });
});

describe("siteContent navigation", () => {
  it("preserves defaults and legacy empty config", () => {
    const empty = normalizeSiteContent(undefined);
    assert.deepEqual(empty.navigation.primary.map((i) => i.href), [
      "/explore",
      "/videos",
      "/images",
      "/explore",
      "/prompts",
    ]);
    assert.equal(empty.navigation.moreLabel, DEFAULT_SITE_NAVIGATION.moreLabel);
    assert.equal(empty.footer.tagline, DEFAULT_SITE_FOOTER.tagline);
  });

  it("supports add/remove/reorder and visibility", () => {
    const base = structuredClone(DEFAULT_SITE_CONTENT);
    const primary: SiteNavItem[] = [
      { id: "a", label: "A", href: "/images", enabled: true, order: 0 },
      { id: "b", label: "B", href: "/videos", enabled: false, order: 1 },
      { id: "c", label: "C", href: "/explore", enabled: true, order: 2 },
    ];
    base.navigation.primary = primary;
    const normalized = normalizeSiteContent(base);
    assert.equal(normalized.navigation.primary.length, 3);

    const enabled = getEnabledNavItems(normalized.navigation.primary);
    assert.deepEqual(
      enabled.map((i) => i.id),
      ["a", "c"],
    );

    const reordered = getEnabledNavItems([
      { ...primary[2]!, order: 0, enabled: true },
      { ...primary[0]!, order: 1, enabled: true },
    ]);
    assert.deepEqual(
      reordered.map((i) => i.id),
      ["c", "a"],
    );
  });

  it("falls back invalid destinations to defaults on normalize", () => {
    const raw = {
      navigation: {
        primary: [
          {
            id: "nav-explore",
            label: "Explore",
            href: "/admin/secret",
            enabled: true,
            order: 0,
          },
        ],
      },
    };
    const normalized = normalizeSiteContent(raw);
    assert.equal(normalized.navigation.primary[0]!.href, "/explore");
    assert.equal(
      getEnabledNavItems([
        {
          id: "x",
          label: "Bad",
          href: "/api/x",
          enabled: true,
          order: 0,
        },
      ]).length,
      0,
    );
  });
});

describe("siteContent footer", () => {
  it("seeds from live footer defaults", () => {
    const f = normalizeSiteContent({}).footer;
    assert.match(f.tagline, /AI dance videos/);
    assert.equal(f.groups.length, 3);
    assert.ok(f.groups[0]!.links.some((l) => l.href === "/explore"));
    assert.ok(
      f.groups[1]!.links.some((l) => l.href === "/about#faq"),
    );
  });

  it("hides empty/invalid social and disabled links", () => {
    const footer = normalizeSiteContent({
      footer: {
        social: [
          { id: "instagram", href: "#", enabled: true, label: "IG" },
          {
            id: "youtube",
            href: "https://youtube.com/@x",
            enabled: true,
            label: "YT",
          },
          { id: "x", href: "", enabled: true, label: "X" },
        ],
      },
    }).footer;
    const social = getVisibleSocialLinks(footer.social);
    assert.deepEqual(
      social.map((s) => s.id),
      ["youtube"],
    );

    const links = getEnabledFooterLinks([
      {
        id: "1",
        label: "Ok",
        href: "/about",
        enabled: true,
        order: 0,
      },
      {
        id: "2",
        label: "Hidden",
        href: "/videos",
        enabled: false,
        order: 1,
      },
      {
        id: "3",
        label: "Bad",
        href: "/admin",
        enabled: true,
        order: 2,
      },
    ]);
    assert.deepEqual(
      links.map((l) => l.id),
      ["1"],
    );
  });

  it("round-trips through normalize (save/reload)", () => {
    const edited: SiteContentConfig = {
      ...DEFAULT_SITE_CONTENT,
      footer: {
        ...DEFAULT_SITE_FOOTER,
        tagline: "Custom tagline",
        copyright: "© {year} Test",
        social: [
          {
            id: "instagram",
            label: "Instagram",
            href: "https://instagram.com/pragvi",
            enabled: true,
          },
          ...DEFAULT_SITE_FOOTER.social.slice(1),
        ],
      },
    };
    const once = normalizeSiteContent(edited);
    const twice = normalizeSiteContent(JSON.parse(JSON.stringify(once)));
    assert.equal(twice.footer.tagline, "Custom tagline");
    assert.equal(formatCopyright(twice.footer.copyright, 2026), "© 2026 Test");
    assert.equal(twice.footer.social[0]!.href, "https://instagram.com/pragvi");
  });

  it("partial/empty footer does not break", () => {
    const f = normalizeSiteContent({ footer: {} }).footer;
    assert.ok(f.tagline.length > 0);
    assert.ok(f.groups.every((g) => g.links.length > 0));
  });
});

describe("siteContent about / faq / legal", () => {
  it("preserves default about content and routes section ids", () => {
    const about = normalizeSiteContent({}).about;
    assert.equal(about.title, DEFAULT_SITE_ABOUT.title);
    assert.deepEqual(
      about.sections.map((s) => s.id),
      ["faq", "licenses", "terms", "privacy"],
    );
    assert.equal(about.faqItems[0]!.question, DEFAULT_SITE_ABOUT.faqItems[0]!.question);
  });

  it("supports FAQ edit/order and empty fallback", () => {
    const about = normalizeSiteContent({
      about: {
        faqItems: [
          {
            id: "faq-b",
            question: "B?",
            answer: "B",
            enabled: true,
            order: 1,
          },
          {
            id: "faq-a",
            question: "A?",
            answer: "A",
            enabled: true,
            order: 0,
          },
          {
            id: "faq-off",
            question: "Off",
            answer: "x",
            enabled: false,
            order: 2,
          },
        ],
      },
    }).about;
    assert.deepEqual(
      about.faqItems.map((f) => f.id),
      ["faq-a", "faq-b", "faq-off"],
    );

    const emptyFaqs = normalizeSiteContent({
      about: { faqItems: [] },
    }).about;
    assert.equal(emptyFaqs.faqItems.length, DEFAULT_SITE_ABOUT.faqItems.length);
  });

  it("renders plain text safely (no HTML injection path)", () => {
    const about = normalizeSiteContent({
      about: {
        intro: '<script>alert(1)</script>\n\nSecond para',
        sections: [
          {
            id: "terms",
            heading: "Terms",
            body: "<b>not html</b>",
            enabled: true,
            order: 2,
          },
        ],
      },
    }).about;
    // Content is stored as plain strings; consumers render as text nodes.
    assert.match(about.intro, /<script>/);
    assert.equal(
      about.sections.find((s) => s.id === "terms")!.body,
      "<b>not html</b>",
    );
  });
});

describe("siteContent promo CTAs", () => {
  it("defaults, visibility, editing, destination validation", () => {
    const promos = normalizeSiteContent({}).promoCtas;
    assert.equal(promos.length, DEFAULT_SITE_PROMO_CTAS.length);
    assert.ok(getPromoCta(promos, "early-access"));

    const edited = normalizeSiteContent({
      promoCtas: [
        {
          id: "early-access",
          enabled: false,
          title: "Hidden",
          description: "d",
          ctaLabel: "Go",
          ctaHref: "/admin",
        },
        {
          id: "newsletter",
          enabled: true,
          title: "Join",
          description: "d",
          ctaLabel: "Join",
          ctaHref: "/explore",
        },
      ],
    }).promoCtas;

    assert.equal(getPromoCta(edited, "early-access"), null);
    assert.equal(getPromoCta(edited, "newsletter")?.ctaHref, "/explore");
    // invalid href falls back to default (empty)
    assert.equal(
      edited.find((p) => p.id === "early-access")!.ctaHref,
      DEFAULT_SITE_PROMO_CTAS[0]!.ctaHref ?? "",
    );
  });
});

describe("siteContent badges", () => {
  it("defaults, visibility, text, tone validation", () => {
    const badges = normalizeSiteContent({}).badges;
    assert.deepEqual(
      badges.map((b) => b.id),
      DEFAULT_SITE_BADGES.map((b) => b.id),
    );
    assert.equal(getBadgeLabel(badges, "trending")?.text, "Trending");

    const edited = normalizeSiteContent({
      badges: [
        {
          id: "trending",
          text: "Hot",
          enabled: true,
          tone: "not-a-tone",
        },
        { id: "new", text: "Fresh", enabled: false, tone: "soft" },
      ],
    }).badges;

    assert.equal(getBadgeLabel(edited, "trending")?.text, "Hot");
    assert.equal(getBadgeLabel(edited, "trending")?.tone, "accent");
    assert.equal(getBadgeLabel(edited, "new"), null);
    assert.equal(getBadgeLabel(edited, "featured")?.text, "Featured");
  });
});
