import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { loadWorkerEnv } from "./config.js";
import {
  createJobRunner,
  type WorkerProcessPayload,
  type WorkerProcessResult,
} from "./processJob.js";

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
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

function parsePayload(body: unknown): WorkerProcessPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const mediaAssetId = String(o.mediaAssetId ?? "").trim();
  const productId = String(o.productId ?? "").trim();
  const masterBucket = String(o.masterBucket ?? "").trim();
  const masterPath = String(o.masterPath ?? "").trim();
  if (!mediaAssetId || !productId || !masterBucket || !masterPath) return null;
  return {
    mediaAssetId,
    productId,
    masterBucket,
    masterPath,
    force: Boolean(o.force),
  };
}

async function main(): Promise<void> {
  const env = loadWorkerEnv();
  const runJob = createJobRunner(env.supabaseUrl, env.supabaseServiceRoleKey);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true, service: "rhythm-media-worker" });
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
      } catch {
        sendJson(res, 400, { ok: false, error: "Invalid JSON body" });
        return;
      }

      const payload = parsePayload(body);
      if (!payload) {
        sendJson(res, 400, {
          ok: false,
          error:
            "mediaAssetId, productId, masterBucket, and masterPath are required",
        });
        return;
      }

      const result = await runJob(payload);
      sendJson(res, result.ok ? 200 : 500, result);
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  });

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`rhythm-media-worker listening on :${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
