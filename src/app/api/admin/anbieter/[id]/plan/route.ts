import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * POST /api/admin/anbieter/[id]/plan
 *
 * Admin-only endpoint to manually override an Anbieter's subscription plan
 * without going through Stripe. Useful for:
 *  - Enterprise deals (negotiated directly)
 *  - Comped / trial accounts
 *  - Corrections after billing errors
 *
 * Body: { plan: string, plan_expires_at: string | null }
 */

const VALID_PLANS = ["free", "starter", "professional", "enterprise"] as const;

const Schema = z.object({
  plan: z.enum(VALID_PLANS),
  plan_expires_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: anbieterId } = await params;
    const supabase = await createClient();

    // ── Auth check: must be admin ──────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    // ── Validate body ──────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
    }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Daten", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { plan, plan_expires_at } = parsed.data;

    // ── Verify anbieter exists ─────────────────────────────────────────────
    const { data: anbieter, error: fetchError } = await supabase
      .from("anbieter")
      .select("id, name, plan")
      .eq("id", anbieterId)
      .single();

    if (fetchError || !anbieter) {
      return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });
    }

    // ── Update plan ────────────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("anbieter")
      .update({
        plan,
        plan_expires_at: plan_expires_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", anbieterId);

    if (updateError) {
      logger.error("admin/plan-override update failed", {
        anbieter_id: anbieterId,
        error: updateError.message,
      });
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    logger.info("admin/plan-override applied", {
      admin_user_id: user.id,
      anbieter_id: anbieterId,
      anbieter_name: anbieter.name,
      old_plan: anbieter.plan,
      new_plan: plan,
      plan_expires_at: plan_expires_at ?? null,
    });

    return NextResponse.json({
      success: true,
      anbieter_id: anbieterId,
      plan,
      plan_expires_at: plan_expires_at ?? null,
    });
  } catch (err) {
    logger.error("admin/plan-override error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
