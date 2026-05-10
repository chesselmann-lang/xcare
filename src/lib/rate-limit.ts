/**
 * Simple in-memory sliding-window rate limiter for Next.js API routes.
 *
 * Works per Vercel function instance (resets on cold-start, which is fine
 * for burst protection). For stricter cross-instance limiting, swap the
 * backing store for Upstash Redis by setting UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN.
 *
 * Usage:
 *   const result = await rateLimit(request, { limit: 10, window: 60 });
 *   if (!result.success) return rateLimitResponse();
 */

import { NextRequest } from "next/server";

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  window: number;
  /** Optional key override (defaults to IP) */
  key?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number; // unix timestamp (seconds)
}

// ── In-memory store ──────────────────────────────────────────────────────────
// Each entry: [timestamps of requests inside the current window]
const store = new Map<string, number[]>();

// Prune the store every 5 minutes to avoid unbounded growth
setInterval(() => {
  const cutoff = Date.now();
  for (const [key, timestamps] of store) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) store.delete(key);
    else store.set(key, valid);
  }
}, 5 * 60 * 1000);

// ── Upstash adapter (optional) ────────────────────────────────────────────────
async function upstashRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // MULTI INCR / EXPIRE in one pipeline call
    const pipeline = [
      ["INCR", key],
      ["EXPIRE", key, windowSeconds],
    ];
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const [incrResult] = await res.json() as [{ result: number }];
    const count = incrResult.result;
    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
    };
  } catch {
    return null; // fail open if Upstash is unreachable
  }
}

// ── Main function ────────────────────────────────────────────────────────────
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, window: windowSeconds, key: customKey } = options;
  const windowMs = windowSeconds * 1000;
  const now = Date.now();

  // Build the rate-limit key
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const key = customKey ?? `rl:${ip}:${request.nextUrl.pathname}`;

  // Try Upstash first
  const upstash = await upstashRateLimit(key, limit, windowSeconds);
  if (upstash) return upstash;

  // Fallback: in-memory sliding window
  const cutoff = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);
  timestamps.push(now);
  store.set(key, timestamps);

  const count = timestamps.length;
  const oldestInWindow = timestamps[0] ?? now;
  const resetAt = Math.floor((oldestInWindow + windowMs) / 1000);

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

/** Returns a standardised 429 Too Many Requests response */
export function rateLimitResponse(resetAt?: number) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Retry-After": String(resetAt ? resetAt - Math.floor(Date.now() / 1000) : 60),
  };
  if (resetAt) headers["X-RateLimit-Reset"] = String(resetAt);

  return new Response(
    JSON.stringify({
      error: "Zu viele Anfragen. Bitte kurz warten und es erneut versuchen.",
    }),
    { status: 429, headers }
  );
}
