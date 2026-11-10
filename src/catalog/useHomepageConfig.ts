"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/admin/store/AdminProvider";
import type {
  HomepageConfigDocument,
  HomepageHeroConfig,
  HomepageSection,
  HomepageSectionCopy,
  HomepageSectionId,
} from "@/admin/types";
import { HOMEPAGE_PUBLISHED_EVENT } from "@/catalog/cmsEvents";
import {
  DEFAULT_HOMEPAGE_HERO,
  DEFAULT_HOMEPAGE_SECTIONS,
  getOrderedEnabledSections,
  normalizeHomepageHero,
  normalizeHomepageSections,
  sectionCopy,
  sectionMaxItems,
  toHomepageConfigDocument,
} from "@/catalog/homepageConfig";
import type { HomepagePublicApiResponse } from "@/catalog/homepagePublished";

export type HomepageConfigSource =
  | "published"
  | "draft-preview"
  | "local-fallback";

export type ResolvedHomepageConfig = {
  hydrated: boolean;
  sections: HomepageSection[];
  enabledSections: HomepageSection[];
  hero: HomepageHeroConfig;
  document: HomepageConfigDocument;
  /** Where the active storefront config came from. */
  source: HomepageConfigSource;
  publishedRevision: number | null;
  getSection: (id: HomepageSectionId) => HomepageSection | undefined;
  getCopy: (id: HomepageSectionId) => HomepageSectionCopy;
  getMaxItems: (id: HomepageSectionId, fallback: number) => number;
  isEnabled: (id: HomepageSectionId) => boolean;
};

type PublishedState = {
  status: "published" | "unpublished";
  document: HomepageConfigDocument | null;
  publishedRevision: number;
  loaded: boolean;
};

/**
 * Storefront/admin shared access to homepage CMS configuration.
 *
 * Prefer published Supabase config for storefront visitors.
 * Explicit Preview Draft uses AdminProvider local draft.
 * Missing/failed publish fetch → existing AdminProvider / seed fallback.
 * Never overwrites a dirty local draft with remote published content.
 */
export function useHomepageConfig(): ResolvedHomepageConfig {
  const {
    homepageSections,
    homepageHero,
    hydrated,
    homepagePreviewDraft,
  } = useAdmin();

  const [published, setPublished] = useState<PublishedState>({
    status: "unpublished",
    document: null,
    publishedRevision: 0,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/homepage", { cache: "no-store" });
        const body = (await res.json()) as HomepagePublicApiResponse;
        if (cancelled) return;
        if (
          res.ok &&
          body.status === "published" &&
          body.document &&
          typeof body.document === "object"
        ) {
          setPublished({
            status: "published",
            document: body.document,
            publishedRevision:
              typeof body.publishedRevision === "number"
                ? body.publishedRevision
                : 0,
            loaded: true,
          });
        } else {
          setPublished({
            status: "unpublished",
            document: null,
            publishedRevision:
              typeof body.publishedRevision === "number"
                ? body.publishedRevision
                : 0,
            loaded: true,
          });
        }
      } catch {
        if (cancelled) return;
        setPublished({
          status: "unpublished",
          document: null,
          publishedRevision: 0,
          loaded: true,
        });
      }
    }

    void load();

    const onPublished = () => {
      void load();
    };
    window.addEventListener(HOMEPAGE_PUBLISHED_EVENT, onPublished);

    return () => {
      cancelled = true;
      window.removeEventListener(HOMEPAGE_PUBLISHED_EVENT, onPublished);
    };
  }, []);

  return useMemo(() => {
    const localSections = normalizeHomepageSections(homepageSections);
    const localHero = normalizeHomepageHero(homepageHero);

    let source: HomepageConfigSource = "local-fallback";
    let sections = localSections;
    let hero = localHero;

    if (homepagePreviewDraft) {
      // Explicit admin-only preview of the local draft.
      source = "draft-preview";
      sections = localSections;
      hero = localHero;
    } else if (!published.loaded) {
      // Avoid flashing a local admin draft before published fetch settles.
      source = "local-fallback";
      sections = normalizeHomepageSections(DEFAULT_HOMEPAGE_SECTIONS);
      hero = normalizeHomepageHero(DEFAULT_HOMEPAGE_HERO);
    } else if (
      published.status === "published" &&
      published.document
    ) {
      source = "published";
      sections = normalizeHomepageSections(published.document.sections);
      hero = normalizeHomepageHero(published.document.hero);
    } else {
      // Unpublished / fetch error → shipped KYC defaults (not a stale admin
      // localStorage draft that may still carry seed merchandising copy).
      // Explicit Preview Draft still uses localSections via the branch above.
      source = "local-fallback";
      sections = normalizeHomepageSections(DEFAULT_HOMEPAGE_SECTIONS);
      hero = normalizeHomepageHero(DEFAULT_HOMEPAGE_HERO);
    }

    const enabledSections = getOrderedEnabledSections(sections);
    const byId = new Map(sections.map((s) => [s.id, s]));
    const configHydrated =
      hydrated && (homepagePreviewDraft || published.loaded);

    return {
      hydrated: configHydrated,
      sections,
      enabledSections,
      hero,
      document: toHomepageConfigDocument(sections, hero),
      source,
      publishedRevision: published.loaded ? published.publishedRevision : null,
      getSection: (id) => byId.get(id),
      getCopy: (id) => sectionCopy(byId.get(id), id),
      getMaxItems: (id, fallback) =>
        sectionMaxItems(byId.get(id), id, fallback),
      isEnabled: (id) => byId.get(id)?.enabled !== false,
    };
  }, [
    homepageSections,
    homepageHero,
    hydrated,
    homepagePreviewDraft,
    published,
  ]);
}
