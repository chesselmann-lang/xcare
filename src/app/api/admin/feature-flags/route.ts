/**
 * /api/admin/feature-flags — CRUD für Feature-Flags (S318)
 *
 * GET  — alle Flags lesen
 * POST — neues Flag anlegen oder bestehendes aktualisieren (upsert)
 * PATCH — einzelnes Flag toggeln (key + enabled)
 *
 * Nur für Admins zugänglich (Admin-E-Mail-Check).
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

// ── Auth-Helper ───────────────────────────────────────────────────────────────

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return null;

  // Admin wenn E-Mail übereinstimmt oder Profil-Rolle "admin" hat
  const { data: profil } = await supabase
    .from("profile")
    .select("rolle")
    .eq("id", user.id)
    .single();

  const isAdmin =
    user.email === adminEmail || profil?.rolle === "admin";

  return isAdmin ? user : null;
}

// ── GET — alle Flags ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("key");

  if (error) {
    logger.error("feature-flags GET error", { error: error.message });
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }

  return NextResponse.json({ flags: data });
}

// ── POST — Flag anlegen / aktualisieren ──────────────────────────────────────

const UpsertSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z_]+$/),
  enabled: z.boolean(),
  description: z.string().max(255).optional().default(""),
  rollout_percent: z.number().int().min(0).max(100).optional().default(100),
});

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .upsert({
      ...parsed.data,
      updated_by: user.email ?? "",
    }, { onConflict: "key" })
    .select()
    .single();

  if (error) {
    logger.error("feature-flags POST error", { error: error.message });
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }

  // Cache entwerten
  revalidateTag("feature_flags");

  logger.info("feature-flag upserted", { key: parsed.data.key, by: user.email });
  return NextResponse.json({ flag: data });
}

// ── PATCH — Toggle (key + enabled) ───────────────────────────────────────────

const ToggleSchema = z.object({
  key: z.string().min(1).max(64),
  enabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .update({
      enabled: parsed.data.enabled,
      updated_by: user.email ?? "",
    })
    .eq("key", parsed.data.key)
    .select()
    .single();

  if (error) {
    logger.error("feature-flags PATCH error", { error: error.message });
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }

  // Cache sofort entwerten
  revalidateTag("feature_flags");

  logger.info("feature-flag toggled", {
    key: parsed.data.key,
    enabled: parsed.data.enabled,
    by: user.email,
  });

  return NextResponse.json({ flag: data });
}

