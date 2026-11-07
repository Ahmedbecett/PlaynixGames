/**
 * Fixed-window in-memory rate limiter.
 * Single-instance safe; for multi-instance deployments swap the store for
 * Redis/Upstash (same interface). Documented in docs/SECURITY.md.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (buckets.size > MAX_KEYS) {
    for (const [k, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, remaining, retryAfterSeconds: 0 };
}

export function enforce(key: string, limit: number, windowMs: number): void {
  const result = consume(key, limit, windowMs);
  if (!result.ok) {
    const error = new Error("Too many requests. Please slow down.");
    Object.assign(error, { status: 429, retryAfterSeconds: result.retryAfterSeconds });
    throw error;
  }
}
