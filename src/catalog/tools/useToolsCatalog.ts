"use client";

import { useEffect, useMemo, useState } from "react";
import type { AiTool, ToolsSettings } from "@/catalog/tools/types";
import { DEFAULT_TOOLS_SETTINGS } from "@/catalog/tools/types";
import { isToolOfferLive } from "@/catalog/tools/homepageDeals";

export type ToolsCatalog = {
  activeTools: AiTool[];
  featured: AiTool[];
  recommended: AiTool[];
  activeDeals: AiTool[];
  settings: ToolsSettings;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  getBySlug: (slug: string) => AiTool | undefined;
  getById: (id: string) => AiTool | undefined;
};

type ToolsApiResponse = {
  tools?: AiTool[];
  settings?: ToolsSettings;
  error?: string;
};

/**
 * Storefront AI Tools catalog from published Supabase data (`/api/tools`).
 * Draft / localStorage admin edits are not used here.
 */
export function useToolsCatalog(): ToolsCatalog {
  const [tools, setTools] = useState<AiTool[]>([]);
  const [settings, setSettings] = useState<ToolsSettings>(DEFAULT_TOOLS_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/tools");
        const body = (await res.json()) as ToolsApiResponse;
        if (cancelled) return;
        if (!res.ok || body.error) {
          setTools([]);
          setSettings(DEFAULT_TOOLS_SETTINGS);
          setError(body.error || `Tools request failed (${res.status})`);
        } else {
          setTools(Array.isArray(body.tools) ? body.tools : []);
          setSettings(body.settings ?? DEFAULT_TOOLS_SETTINGS);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setTools([]);
        setSettings(DEFAULT_TOOLS_SETTINGS);
        setError(err instanceof Error ? err.message : "Tools request failed");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHydrated(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const activeTools = tools
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
      settings,
      hydrated,
      loading,
      error,
      getBySlug: (slug: string) => bySlug.get(slug),
      getById: (id: string) => byId.get(id),
    };
  }, [tools, settings, hydrated, loading, error]);
}
