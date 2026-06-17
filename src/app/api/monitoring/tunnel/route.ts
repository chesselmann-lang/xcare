/**
 * Sentry Tunnel Route
 * Leitet Sentry-Events über den eigenen Server weiter, um Ad-Blocker zu umgehen.
 * Empfohlen für DSGVO-konforme Setups in Deutschland.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SENTRY_HOST = "sentry.io";
const SENTRY_PROJECT_IDS = [process.env.SENTRY_PROJECT_ID ?? ""];

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    const pieces = envelope.split("\n");
    const header = JSON.parse(pieces[0]);

    const dsn = new URL(header.dsn as string);
    if (dsn.hostname !== SENTRY_HOST) {
      return NextResponse.json({ error: "Invalid DSN" }, { status: 400 });
    }

    const projectId = dsn.pathname.split("/").pop();
    if (!projectId || !SENTRY_PROJECT_IDS.includes(projectId)) {
      return NextResponse.json({ error: "Invalid Project" }, { status: 403 });
    }

    const upstream = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;
    const res = await fetch(upstream, {
      method: "POST",
      body: envelope,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
      },
    });

    return new NextResponse(res.body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("[Sentry Tunnel] Error:", { error: err });
    return NextResponse.json({ error: "Tunnel error" }, { status: 500 });
  }
}
