import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface TemplateBody {
  name: string;
  beschreibung?: string;
  betreff: string;
  html: string;
  text?: string;
  aktiv?: boolean;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return supabase;
}

/** GET /api/admin/email-templates */
export async function GET() {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("GET /api/admin/email-templates failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/admin/email-templates */
export async function POST(req: Request) {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }
    const body: TemplateBody = await req.json();
    if (!body.name || !body.betreff || !body.html) {
      return NextResponse.json({ error: "name, betreff und html sind Pflichtfelder" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        name: body.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        beschreibung: body.beschreibung ?? null,
        betreff: body.betreff,
        html: body.html,
        text: body.text ?? null,
        aktiv: body.aktiv ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("POST /api/admin/email-templates failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** PATCH /api/admin/email-templates?id=... */
export async function PATCH(req: Request) {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id fehlt" }, { status: 400 });
    }
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.betreff !== undefined) updates.betreff = body.betreff;
    if (body.html !== undefined) updates.html = body.html;
    if (body.text !== undefined) updates.text = body.text;
    if (body.aktiv !== undefined) updates.aktiv = body.aktiv;
    if (body.beschreibung !== undefined) updates.beschreibung = body.beschreibung;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    logger.error("PATCH /api/admin/email-templates failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/admin/email-templates?id=... */
export async function DELETE(req: Request) {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id fehlt" }, { status: 400 });
    }
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error("DELETE /api/admin/email-templates failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
