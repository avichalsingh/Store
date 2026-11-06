import type { AiTool, ToolsSettings } from "@/catalog/tools/types";
import { catalogPublishUserMessage } from "@/catalog/catalogRemotePublish";

export type PublishToolResult =
  | {
      ok: true;
      id: string;
      status: string;
      dryRun: boolean;
      message: string;
    }
  | { ok: false; error: string; status: number };

type PublishBody = {
  error?: string;
  id?: string;
  status?: string;
  ok?: boolean;
  dryRun?: boolean;
  message?: string;
};

async function parseResult(
  response: Response,
  entityLabel: string,
  fallbackId: string,
  fallbackStatus: string,
): Promise<PublishToolResult> {
  let body: PublishBody = {};
  try {
    body = (await response.json()) as PublishBody;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Admin session expired or invalid. Sign out and sign in with the admin API password."
        : `Failed to publish ${entityLabel.toLowerCase()} to the storefront catalog`;
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : fallback,
      status: response.status,
    };
  }

  const status = body.status ?? fallbackStatus;
  const dryRun = Boolean(body.dryRun);
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : catalogPublishUserMessage(entityLabel, status, dryRun);

  return {
    ok: true,
    id: body.id ?? fallbackId,
    status,
    dryRun,
    message,
  };
}

/**
 * Publish / unpublish a tool to Supabase (gated by CATALOG_REMOTE_PUBLISH).
 * Deal fields travel with the tool payload but are stored in the deal column
 * independently of affiliate_url.
 */
export async function publishToolToCatalog(
  tool: AiTool,
): Promise<PublishToolResult> {
  let response: Response;
  try {
    response = await fetch("/api/admin/catalog/tools/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ tool }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the tools publish API",
      status: 0,
    };
  }

  return parseResult(response, "Tool", tool.id, tool.status);
}

/** Publish tools settings (disclosure + homepage deal ranking) to Supabase. */
export async function publishToolsSettingsToCatalog(
  settings: ToolsSettings,
): Promise<PublishToolResult> {
  let response: Response;
  try {
    response = await fetch("/api/admin/catalog/tools/settings/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ settings }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the tools settings publish API",
      status: 0,
    };
  }

  return parseResult(response, "Tools settings", "default", "active");
}
