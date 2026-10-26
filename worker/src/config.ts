/**
 * Worker environment — server/container only.
 * Never ship these values to a browser bundle.
 */

export type WorkerEnv = {
  port: number;
  /** Max simultaneous FFmpeg jobs (different assets). Default 1 for 512MB hosts. */
  maxConcurrentJobs: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  workerSharedSecret: string;
};

export function loadWorkerEnv(): WorkerEnv {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const workerSharedSecret = process.env.WORKER_SHARED_SECRET?.trim() || "";
  const port = Number(process.env.PORT || process.env.WORKER_PORT || 8787);
  const maxRaw = Number(process.env.WORKER_MAX_CONCURRENT_JOBS ?? "1");
  const maxConcurrentJobs =
    Number.isFinite(maxRaw) && maxRaw >= 1 ? Math.floor(maxRaw) : 1;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required");
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  }
  if (!workerSharedSecret) {
    throw new Error("WORKER_SHARED_SECRET is required");
  }
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("PORT must be a positive number");
  }

  return {
    port,
    maxConcurrentJobs,
    supabaseUrl,
    supabaseServiceRoleKey,
    workerSharedSecret,
  };
}
