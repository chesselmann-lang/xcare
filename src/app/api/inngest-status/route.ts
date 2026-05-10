import { NextResponse } from "next/server";

/**
 * DEPRECATED — this endpoint was removed in Sprint 231.
 * Inngest events are now fired server-side from the statusAendern action.
 * Returns 410 Gone so any lingering clients get a clear signal.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been removed. Events are fired server-side." },
    { status: 410 }
  );
}
