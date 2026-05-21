import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type BannerTyp = "info" | "warning" | "error" | "success";
type Zielgruppe = "alle" | "anbieter" | "familie" | "admin";

interface CreateBannerBody {
  typ: BannerTyp;
  titel?: string;
  nachricht: string;
  zielgruppe: Zielgruppe;
  gueltig_bis?: string | null;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return supabase;
}

/** GET /api/admin/banner — list all banners */
export async function GET() {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 403 }
      );
    }
    const { data, error } = await supabase
      .from("system_banners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("GET /api/admin/banner failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/admin/banner — create banner */
export async function POST(req: Request) {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 403 }
      );
    }
    const body: CreateBannerBody = await req.json();
    if (!body.nachricht || !body.typ || !body.zielgruppe) {
      return NextResponse.json(
        { error: "Pflichtfelder fehlen" },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("system_banners")
      .insert({
        typ: body.typ,
        titel: body.titel ?? null,
        nachricht: body.nachricht,
        zielgruppe: body.zielgruppe,
        gueltig_bis: body.gueltig_bis ?? null,
        aktiv: true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("POST /api/admin/banner failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** PATCH /api/admin/banner?id=... — toggle aktiv */
export async function PATCH(req: Request) {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id fehlt" }, { status: 400 });
    }
    const body = await req.json();
    const { data, error } = await supabase
      .from("system_banners")
      .update({ aktiv: body.aktiv })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    logger.error("PATCH /api/admin/banner failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/admin/banner?id=... — delete banner */
export async function DELETE(req: Request) {
  try {
    const supabase = await requireAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id fehlt" }, { status: 400 });
    }
    const { error } = await supabase
      .from("system_banners")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error("DELETE /api/admin/banner failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
