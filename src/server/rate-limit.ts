/**
 * Rate limiting for the public and abuse-prone API routes.
 *
 * Fixed windows keyed by `${bucket}:${subject}`, where the subject is the
 * caller's uid when signed in, else the client IP. Two stores:
 *
 *   upstash — shared across every serverless instance, used when
 *             UPSTASH_REDIS_REST_URL/TOKEN are set (plain fetch, no SDK)
 *   memory  — per instance; still stops a single hot loop, but a burst
 *             spread across instances is only slowed, not stopped
 *
 * Failing open is deliberate: a store outage must not lock every user out.
 */

export interface RateLimitRule {
  /** Name of the bucket, e.g. "verify". */
  bucket: string;
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
  store: "upstash" | "memory";
}

/* ───────────── memory store ───────────── */

const memory = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

const memoryHit = (key: string, rule: RateLimitRule, now: number): RateLimitResult => {
  // Sweep expired windows occasionally so the map cannot grow without bound.
  if (now - lastSweep > 60_000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    lastSweep = now;
  }
  const windowMs = rule.windowSeconds * 1000;
  const entry = memory.get(key);
  const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + windowMs };
  current.count += 1;
  memory.set(key, current);
  return {
    allowed: current.count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - current.count),
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    store: "memory",
  };
};

/* ───────────── upstash store ───────────── */

const upstashHit = async (key: string, rule: RateLimitRule): Promise<RateLimitResult | null> => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    // INCR then EXPIRE NX in one pipeline: the first hit sets the window.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(rule.windowSeconds), "NX"],
        ["TTL", key],
      ]),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ result?: number }>;
    const count = Number(rows[0]?.result ?? 0);
    const ttl = Number(rows[2]?.result ?? rule.windowSeconds);
    return {
      allowed: count <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfter: Math.max(1, ttl),
      store: "upstash",
    };
  } catch {
    return null;
  }
};

/* ───────────── api ───────────── */

/** Best-effort client IP behind Vercel's proxy. */
export const clientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
};

export const rateLimit = async (rule: RateLimitRule, subject: string): Promise<RateLimitResult> => {
  const key = `rl:${rule.bucket}:${subject}`;
  return (await upstashHit(key, rule)) ?? memoryHit(key, rule, Date.now());
};

/** Standard headers so clients (and humans reading curl output) can see the budget. */
export const rateLimitHeaders = (result: RateLimitResult): Record<string, string> => ({
  "RateLimit-Limit": String(result.limit),
  "RateLimit-Remaining": String(result.remaining),
  "RateLimit-Reset": String(result.retryAfter),
  ...(result.allowed ? {} : { "Retry-After": String(result.retryAfter) }),
});

/** The rules each public route uses. One place, so the numbers are reviewable. */
export const RATE_LIMITS = {
  /** Public certificate/ticket lookups: generous, but not a scraper's friend. */
  verify: { bucket: "verify", limit: 60, windowSeconds: 60 },
  /** Password reset: unauthenticated and sends email — tight. */
  passwordReset: { bucket: "pw-reset", limit: 5, windowSeconds: 15 * 60 },
  /** Verification resend: authenticated, per user. */
  verification: { bucket: "verify-email", limit: 5, windowSeconds: 15 * 60 },
  /** Registration and team changes: per user; a human cannot need more. */
  registration: { bucket: "register", limit: 20, windowSeconds: 60 },
  /** Health: cheap, but it does nine backend calls. */
  health: { bucket: "health", limit: 30, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;
