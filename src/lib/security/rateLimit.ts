/**
 * Simple in-memory sliding-window rate limiter for serverless/Node.
 * Best-effort abuse control — not a distributed limiter.
 * Key should include a coarse client identifier (IP), never secrets.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 5_000;

function prune(now: number): void {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    // Drop oldest half if still full (DoS protection for the map itself).
    let i = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++i >= Math.floor(MAX_KEYS / 2)) break;
    }
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      ok: true,
      remaining: options.limit - 1,
      retryAfterSec: Math.ceil(options.windowMs / 1000),
    };
  }
  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: options.limit - existing.count,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Best-effort client IP from common proxy headers (do not trust for auth). */
export function clientIpFromRequest(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}
