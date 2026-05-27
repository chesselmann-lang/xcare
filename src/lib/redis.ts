/**
 * Upstash Redis client for rate limiting and caching
 * Install: npm install @upstash/redis @upstash/ratelimit
 */
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Graceful fallback if not configured
const isConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

export const redis = isConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Rate limiters
export const rateLimiters = isConfigured && redis ? {
  // API: 60 requests per minute
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "xcare:ratelimit:api",
  }),
  // AI endpoints: 10 requests per minute
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "xcare:ratelimit:ai",
  }),
  // Auth: 5 attempts per 15 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, "15 m"),
    prefix: "xcare:ratelimit:auth",
  }),
} : null;

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export async function checkRateLimit(
  limiter: keyof typeof rateLimiters,
  identifier: string
): Promise<RateLimitResult> {
  if (!rateLimiters) {
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }
  const rl = rateLimiters[limiter as keyof typeof rateLimiters];
  if (!rl) return { success: true, limit: 999, remaining: 999, reset: 0 };
  return await rl.limit(identifier);
}

// Simple cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  return await redis.get<T>(`xcare:cache:${key}`);
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return;
  await redis.set(`xcare:cache:${key}`, value, { ex: ttlSeconds });
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;
  await redis.del(`xcare:cache:${key}`);
}
