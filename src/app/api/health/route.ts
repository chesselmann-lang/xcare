import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const START_TIME = Date.now();

export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; detail?: string }> = {};

  // --- DB connectivity check ---
  const dbStart = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1).single();
    // PGRST116 = no rows found — still means DB is reachable
    if (error && error.code !== "PGRST116") throw error;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      detail: err instanceof Error ? err.message : "unknown error",
    };
  }

  // --- Overall status ---
  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const statusCode = allOk ? 200 : 503;

  const body = {
    status: allOk ? "ok" : "degraded",
    version: process.env.npm_package_version ?? "1.0.0",
    environment: process.env.NODE_ENV ?? "production",
    uptime: {
      seconds: Math.floor((Date.now() - START_TIME) / 1000),
      since: new Date(START_TIME).toISOString(),
    },
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(body, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store",
      "X-Health-Check": "xcare",
    },
  });
}
