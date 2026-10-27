import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { loadWorkerEnv } from "./config.js";
import { terminateAllFfmpeg } from "./ffmpeg.js";
import {
  createJobRunner,
  type WorkerProcessPayload,
  type WorkerProcessResult,
} from "./processJob.js";
import { MEDIA_MASTERS_BUCKET } from "./supabase.js";

/** In-flight jobs by mediaAssetId — prevents concurrent FFmpeg for one asset. */
const activeJobs = new Set<string>();
/** FIFO of accepted async jobs waiting for a concurrency slot. */
const pendingQueue: WorkerProcessPayload[] = [];

const MAX_BODY_BYTES = 256 * 1024;
const SAFE_ID_RE = /^[a-zA-Z0-9._-]{1,128}$/;
const SAFE_PATH_RE = /^[a-zA-Z0-9._/-]{1,512}$/;

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: Record<string, unknown> | WorkerProcessResult,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    // Worker is service-to-service only — do not allow browser cross-origin calls.
    "Access-Control-Allow-Origin": "null",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
}

function authorize(
  req: IncomingMessage,
  expectedSecret: string,
): boolean {
  const header = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]) return false;
  try {
    const a = Buffer.from(match[1]);
    const b = Buffer.from(expectedSecret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isSafeObjectPath(path: string): boolean {
  if (!path || path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    return false;
  }
  if (!SAFE_PATH_RE.test(path)) return false;
  return true;
}

function parsePayload(body: unknown): WorkerProcessPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const mediaAssetId = String(o.mediaAssetId ?? "").trim();
  const productId = String(o.productId ?? "").trim();
  const masterBucket = String(o.masterBucket ?? "").trim();
  const masterPath = String(o.masterPath ?? "").trim();
  if (!mediaAssetId || !productId || !masterBucket || !masterPath) return null;
  if (!SAFE_ID_RE.test(mediaAssetId) || !SAFE_ID_RE.test(productId)) return null;
  if (masterBucket !== MEDIA_MASTERS_BUCKET) return null;
  if (!isSafeObjectPath(masterPath)) return null;
  return {
    mediaAssetId,
    productId,
    masterBucket,
    masterPath,
    force: Boolean(o.force),
    async: Boolean(o.async),
    watermark:
      o.watermark && typeof o.watermark === "object"
        ? (o.watermark as Record<string, unknown>)
        : undefined,
  };
}

function isQueuedOrActive(mediaAssetId: string): boolean {
  if (activeJobs.has(mediaAssetId)) return true;
  return pendingQueue.some((p) => p.mediaAssetId === mediaAssetId);
}

/** Avoid leaking signed URLs or absolute paths in sync /process error bodies. */
function publicJobError(result: WorkerProcessResult): WorkerProcessResult {
  if (result.ok) return result;
  const raw = result.error || "Processing failed";
  if (/https?:\/\//i.test(raw) || /\/tmp\/|\/var\/|rhythm-media-/i.test(raw)) {
    return { ok: false, error: "Processing failed" };
  }
  return { ok: false, error: raw.slice(0, 500) };
}

async function main(): Promise<void> {
  const env = loadWorkerEnv();
  const runJob = createJobRunner(env.supabaseUrl, env.supabaseServiceRoleKey);

  const drainQueue = () => {
    while (
      activeJobs.size < env.maxConcurrentJobs &&
      pendingQueue.length > 0
    ) {
      const payload = pendingQueue.shift()!;
      const { mediaAssetId } = payload;
      if (activeJobs.has(mediaAssetId)) {
        continue;
      }
      activeJobs.add(mediaAssetId);
      void runJob(payload)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(
            `[worker] async job failed mediaAssetId=${mediaAssetId}`,
            err instanceof Error ? err.message : err,
          );
        })
        .finally(() => {
          activeJobs.delete(mediaAssetId);
          drainQueue();
        });
    }
  };

  const server = createServer(async (req, res) => {
    // Reject CORS preflight from browsers — this API is not browser-facing.
    if (req.method === "OPTIONS") {
      res.writeHead(403);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "rhythm-media-worker",
        activeJobs: activeJobs.size,
        pendingJobs: pendingQueue.length,
        maxConcurrentJobs: env.maxConcurrentJobs,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/process") {
      if (!authorize(req, env.workerSharedSecret)) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      let body: unknown;
      try {
        body = await readJson(req);
      } catch (err) {
        const msg =
          err instanceof Error && err.message === "Request body too large"
            ? "Request body too large"
            : "Invalid JSON body";
        sendJson(res, 400, { ok: false, error: msg });
        return;
      }

      const payload = parsePayload(body);
      if (!payload) {
        sendJson(res, 400, {
          ok: false,
          error:
            "Invalid job payload (mediaAssetId, productId, media-masters path required)",
        });
        return;
      }

      const { mediaAssetId, force, async: runAsync } = payload;

      // Idempotent: one concurrent/queued FFmpeg job per asset.
      if (isQueuedOrActive(mediaAssetId) && !force) {
        sendJson(res, 202, {
          ok: true,
          accepted: true,
          status: "processing",
          mediaAssetId,
          message: "Job already in progress",
        });
        return;
      }

      if (runAsync) {
        if (activeJobs.has(mediaAssetId) && force) {
          sendJson(res, 202, {
            ok: true,
            accepted: true,
            status: "processing",
            mediaAssetId,
            message: "Job already in progress",
          });
          return;
        }

        for (let i = pendingQueue.length - 1; i >= 0; i--) {
          if (pendingQueue[i]?.mediaAssetId === mediaAssetId) {
            pendingQueue.splice(i, 1);
          }
        }

        pendingQueue.push(payload);
        sendJson(res, 202, {
          ok: true,
          accepted: true,
          status: "queued",
          mediaAssetId,
          message: "Job accepted — processing in background",
        });
        drainQueue();
        return;
      }

      if (activeJobs.has(mediaAssetId)) {
        sendJson(res, 202, {
          ok: true,
          accepted: true,
          status: "processing",
          mediaAssetId,
          message: "Job already in progress",
        });
        return;
      }

      activeJobs.add(mediaAssetId);
      try {
        const result = await runJob(payload);
        sendJson(res, result.ok ? 200 : 500, publicJobError(result));
      } finally {
        activeJobs.delete(mediaAssetId);
        drainQueue();
      }
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  });

  server.listen(env.port, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(
      `rhythm-media-worker listening on 0.0.0.0:${env.port} ` +
        `(maxConcurrentJobs=${env.maxConcurrentJobs})`,
    );
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[worker] ${signal} received — closing HTTP server`);
    terminateAllFfmpeg("SIGTERM");
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => {
      terminateAllFfmpeg("SIGKILL");
      process.exit(0);
    }, 25_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
