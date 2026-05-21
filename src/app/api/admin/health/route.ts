import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";
const TIMEOUT_MS = 5000;

type ServiceStatus = "ok" | "degraded" | "down" | "unconfigured";

interface ServiceResult {
  name: string;
  status: ServiceStatus;
  latency_ms: number | null;
  detail: string;
}

/** Wraps a fetch with a timeout and measures latency. */
async function timedFetch(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; latency_ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return { ok: res.ok, status: res.status, latency_ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

// ── Individual health checks ──────────────────────────────────────────────────

async function checkSupabase(): Promise<ServiceResult> {
  const t0 = Date.now();
  try {
    const supabase = await createClient();
    // Lightweight ping — count a small table
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    const latency_ms = Date.now() - t0;
    if (error) throw error;
    return { name: "Supabase", status: "ok", latency_ms, detail: "Verbindung OK" };
  } catch (err) {
    return {
      name: "Supabase",
      status: "down",
      latency_ms: Date.now() - t0,
      detail: err instanceof Error ? err.message : "Verbindungsfehler",
    };
  }
}

async function checkAnthropic(): Promise<ServiceResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "sk-ant-") {
    return { name: "Anthropic", status: "unconfigured", latency_ms: null, detail: "ANTHROPIC_API_KEY nicht gesetzt" };
  }
  try {
    const { ok, status, latency_ms } = await timedFetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    });
    if (ok) return { name: "Anthropic", status: "ok", latency_ms, detail: "API erreichbar" };
    return { name: "Anthropic", status: "degraded", latency_ms, detail: `HTTP ${status}` };
  } catch (err) {
    return {
      name: "Anthropic",
      status: "down",
      latency_ms: null,
      detail: err instanceof Error ? err.message : "Timeout",
    };
  }
}

async function checkStripe(): Promise<ServiceResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_live_") {
    return { name: "Stripe", status: "unconfigured", latency_ms: null, detail: "STRIPE_SECRET_KEY nicht gesetzt" };
  }
  try {
    const { ok, status, latency_ms } = await timedFetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (ok) return { name: "Stripe", status: "ok", latency_ms, detail: "Balance API OK" };
    if (status === 401) return { name: "Stripe", status: "degraded", latency_ms, detail: "Ungültiger API-Key" };
    return { name: "Stripe", status: "degraded", latency_ms, detail: `HTTP ${status}` };
  } catch (err) {
    return {
      name: "Stripe",
      status: "down",
      latency_ms: null,
      detail: err instanceof Error ? err.message : "Timeout",
    };
  }
}

async function checkResend(): Promise<ServiceResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_") {
    return { name: "Resend", status: "unconfigured", latency_ms: null, detail: "RESEND_API_KEY nicht gesetzt" };
  }
  try {
    const { ok, status, latency_ms } = await timedFetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (ok) return { name: "Resend", status: "ok", latency_ms, detail: "Domains API OK" };
    if (status === 401) return { name: "Resend", status: "degraded", latency_ms, detail: "Ungültiger API-Key" };
    return { name: "Resend", status: "degraded", latency_ms, detail: `HTTP ${status}` };
  } catch (err) {
    return {
      name: "Resend",
      status: "down",
      latency_ms: null,
      detail: err instanceof Error ? err.message : "Timeout",
    };
  }
}

async function checkInngest(): Promise<ServiceResult> {
  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  if (!eventKey && !signingKey) {
    return { name: "Inngest", status: "unconfigured", latency_ms: null, detail: "INNGEST_EVENT_KEY nicht gesetzt" };
  }
  // Inngest has no public unauthenticated ping; check connectivity to their API
  try {
    const { ok, latency_ms } = await timedFetch("https://api.inngest.com/", {
      headers: eventKey ? { Authorization: `Bearer ${eventKey}` } : {},
    });
    // Even a 404/401 means the host is reachable
    return { name: "Inngest", status: ok ? "ok" : "degraded", latency_ms, detail: ok ? "API erreichbar" : "Host erreichbar, Auth prüfen" };
  } catch (err) {
    return {
      name: "Inngest",
      status: "down",
      latency_ms: null,
      detail: err instanceof Error ? err.message : "Timeout",
    };
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Admin guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = profile?.role === "admin" || user.email === ADMIN_EMAIL;
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Run all checks in parallel
    const services = await Promise.all([
      checkSupabase(),
      checkAnthropic(),
      checkStripe(),
      checkResend(),
      checkInngest(),
    ]);

    return NextResponse.json(
      { services, checked_at: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("GET /api/admin/health failed", { error: String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
