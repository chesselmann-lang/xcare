/**
 * Server-side environment variable validation.
 * Uses Zod for type-safe, fail-fast startup checks.
 *
 * Import this module early (e.g. instrumentation.ts or layout.tsx server component)
 * so misconfigured deployments fail loudly at boot rather than silently at request time.
 *
 * NOTE: This file must ONLY be imported from server-side code (routes, server actions,
 * instrumentation). It references process.env vars that are not available in the browser.
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  // ── Supabase ─────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ required_error: "NEXT_PUBLIC_SUPABASE_URL is required" })
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ required_error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY must not be empty"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ required_error: "SUPABASE_SERVICE_ROLE_KEY is required" })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY must not be empty"),

  // ── Anthropic ─────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z
    .string({ required_error: "ANTHROPIC_API_KEY is required" })
    .min(1, "ANTHROPIC_API_KEY must not be empty"),

  // ── App base URL ──────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z
    .string({ required_error: "NEXT_PUBLIC_APP_URL is required" })
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // ── Resend (email) ────────────────────────────────────────────────────────
  RESEND_API_KEY: z
    .string({ required_error: "RESEND_API_KEY is required" })
    .min(1, "RESEND_API_KEY must not be empty"),

  // ── Stripe (optional — Stripe features disabled when absent) ─────────────
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_STARTER_YEARLY: z.string().min(1).optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().min(1).optional(),

  // ── Inngest (optional — email event notifications disabled when absent) ───
  INNGEST_EVENT_KEY: z.string().min(1).optional(),

  // ── Upstash Redis (optional — rate-limiting disabled when absent) ─────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── Misc optional ─────────────────────────────────────────────────────────
  RESEND_FROM_EMAIL: z.string().email().optional(),
  UNSUBSCRIBE_SECRET: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function validateEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n\n❌  xcare — invalid/missing environment variables:\n${issues}\n\n` +
      `Check your .env.local file or Vercel/Mittwald environment settings.\n`
    );
  }

  return result.data;
}

/**
 * Validated, typed environment variables.
 * Throws on first access if required vars are missing.
 */
export const env = validateEnv();
