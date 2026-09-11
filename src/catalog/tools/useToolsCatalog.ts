"use client";

import { useMemo } from "react";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AiTool, ToolsSettings } from "@/catalog/tools/types";
import { isToolOfferLive } from "@/catalog/tools/homepageDeals";

export type ToolsCatalog = {
  activeTools: AiTool[];
  featured: AiTool[];
  recommended: AiTool[];
  activeDeals: AiTool[];
  settings: ToolsSettings;
  hydrated: boolean;
  getBySlug: (slug: string) => AiTool | undefined;
  getById: (id: string) => AiTool | undefined;
};

/**
 * Live AI Tools catalog derived from Admin CMS state.
 */
export function useToolsCatalog(): ToolsCatalog {
  const { aiTools, toolsSettings, hydrated } = useAdmin();

  return useMemo(() => {
    const activeTools = (aiTools ?? [])
      .filter((t) => t.status === "active")
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const bySlug = new Map(activeTools.map((t) => [t.slug, t]));
    const byId = new Map(activeTools.map((t) => [t.id, t]));

    return {
      activeTools,
      featured: activeTools.filter((t) => t.featured),
      recommended: activeTools.filter((t) => t.recommended),
      activeDeals: activeTools.filter((t) => isToolOfferLive(t)),
      settings: toolsSettings,
      hydrated,
      getBySlug: (slug: string) => bySlug.get(slug),
      getById: (id: string) => byId.get(id),
    };
  }, [aiTools, toolsSettings, hydrated]);
}
