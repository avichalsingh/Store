/**
 * Server-only: dispatch a validated processing job to the dedicated FFmpeg worker.
 * Never import from client components.
 */

import type {
  WorkerProcessPayload,
  WorkerProcessResult,
} from "@/lib/mediaProcessing/types";

export function getWorkerConfig():
  | { ok: true; url: string; secret: string }
  | { ok: false; error: string } {
  const url = process.env.WORKER_URL?.trim().replace(/\/$/, "");
  const secret = process.env.WORKER_SHARED_SECRET?.trim();
  if (!url) {
    return {
      ok: false,
      error: "WORKER_URL is not configured",
    };
  }
  if (!secret) {
    return {
      ok: false,
      error: "WORKER_SHARED_SECRET is not configured",
    };
  }
  return { ok: true, url, secret };
}

/**
 * POST to the dedicated worker. Holds the connection until FFmpeg finishes
 * (or fails). Secrets stay server-side; response never includes them.
 */
export async function dispatchWorkerProcess(
  payload: WorkerProcessPayload,
): Promise<WorkerProcessResult> {
  const config = getWorkerConfig();
  if (!config.ok) {
    return { ok: false, error: config.error };
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.secret}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker unreachable";
    return { ok: false, error: `Worker dispatch failed: ${message}` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      error: `Worker returned non-JSON (${response.status})`,
    };
  }

  if (!body || typeof body !== "object") {
    return { ok: false, error: "Worker returned an invalid payload" };
  }

  const result = body as WorkerProcessResult;
  if (result.ok === true) {
    return result;
  }
  if (result.ok === false && typeof result.error === "string") {
    return result;
  }

  if (!response.ok) {
    const errMsg =
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Worker HTTP ${response.status}`;
    return { ok: false, error: errMsg };
  }

  return { ok: false, error: "Worker returned an unrecognized response" };
}
