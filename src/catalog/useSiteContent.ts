"use client";

import { useMemo } from "react";
import { useAdmin } from "@/admin/store/AdminProvider";
import {
  DEFAULT_SITE_CONTENT,
  getBadgeLabel,
  getEnabledNavItems,
  getPromoCta,
  normalizeSiteContent,
  type SiteBadgeLabel,
  type SiteContentConfig,
  type SiteNavItem,
  type SitePromoCta,
} from "@/catalog/siteContent";

export type ResolvedSiteContent = SiteContentConfig & {
  hydrated: boolean;
  primaryNav: SiteNavItem[];
  moreNav: SiteNavItem[];
  getBadge: (id: SiteBadgeLabel["id"]) => SiteBadgeLabel | null;
  getPromo: (id: SitePromoCta["id"]) => SitePromoCta | null;
};

export function useSiteContent(): ResolvedSiteContent {
  const { siteContent, hydrated } = useAdmin();

  return useMemo(() => {
    const content = normalizeSiteContent(siteContent ?? DEFAULT_SITE_CONTENT);
    return {
      ...content,
      hydrated,
      primaryNav: getEnabledNavItems(content.navigation.primary),
      moreNav: getEnabledNavItems(content.navigation.more),
      getBadge: (id) => getBadgeLabel(content.badges, id),
      getPromo: (id) => getPromoCta(content.promoCtas, id),
    };
  }, [siteContent, hydrated]);
}
