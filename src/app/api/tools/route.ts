import {
  mapCatalogToolRows,
  normalizePublishedToolsSettings,
} from "@/catalog/mapAdminToolToSupabase";
import { DEFAULT_TOOLS_SETTINGS, type AiTool, type ToolsSettings } from "@/catalog/tools/types";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60;

type ToolsApiResponse = {
  tools: AiTool[];
  settings: ToolsSettings;
  error?: string;
};

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Public Supabase client is not configured");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Public AI Tools catalog.
 * Reads catalog_ai_tools (active only) + catalog_tools_settings.
 * Never returns metadata / monitoring / draft tools.
 */
export async function GET() {
  try {
    const supabase = getPublicClient();

    const [toolsResult, settingsResult] = await Promise.all([
      supabase
        .from("catalog_ai_tools")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase.from("catalog_tools_settings").select("settings").maybeSingle(),
    ]);

    if (toolsResult.error) {
      console.error("[api/tools] catalog_ai_tools:", toolsResult.error.message);
      return NextResponse.json(
        {
          tools: [],
          settings: DEFAULT_TOOLS_SETTINGS,
          error: "Tools catalog temporarily unavailable",
        } satisfies ToolsApiResponse,
        { status: 502 },
      );
    }

    const tools = mapCatalogToolRows(
      (toolsResult.data ?? []) as Parameters<typeof mapCatalogToolRows>[0],
    );

    let settings = DEFAULT_TOOLS_SETTINGS;
    if (!settingsResult.error && settingsResult.data?.settings) {
      settings = normalizePublishedToolsSettings(settingsResult.data.settings);
    } else if (settingsResult.error) {
      console.error(
        "[api/tools] catalog_tools_settings:",
        settingsResult.error.message,
      );
    }

    return NextResponse.json({
      tools,
      settings,
    } satisfies ToolsApiResponse);
  } catch (err) {
    console.error("[api/tools]", err);
    return NextResponse.json(
      {
        tools: [],
        settings: DEFAULT_TOOLS_SETTINGS,
        error: "Tools catalog temporarily unavailable",
      } satisfies ToolsApiResponse,
      { status: 500 },
    );
  }
}
