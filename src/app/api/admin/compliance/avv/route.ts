import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const adminEmail = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";
  if (profile?.role !== "admin" && user.email !== adminEmail) {
    return { supabase, user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, user, error: null };
}

export async function GET() {
  const { supabase, error } = await assertAdmin();
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("avv_partner")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const { supabase, error } = await assertAdmin();
  if (error) return error;

  const body = await request.json() as {
    name: string;
    dienst: string;
    avv_unterzeichnet?: boolean;
    unterzeichnet_am?: string | null;
    naechste_pruefung?: string | null;
    notizen?: string | null;
  };

  const { name, dienst, avv_unterzeichnet = false, unterzeichnet_am, naechste_pruefung, notizen } = body;

  if (!name || !dienst) {
    return NextResponse.json({ error: "name und dienst sind Pflichtfelder" }, { status: 400 });
  }

  const { data, error: dbErr } = await supabase
    .from("avv_partner")
    .insert({ name, dienst, avv_unterzeichnet, unterzeichnet_am, naechste_pruefung, notizen })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { supabase, error } = await assertAdmin();
  if (error) return error;

  const body = await request.json() as {
    id: string;
    avv_unterzeichnet?: boolean;
    unterzeichnet_am?: string | null;
    naechste_pruefung?: string | null;
    notizen?: string | null;
    name?: string;
    dienst?: string;
  };

  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const { data, error: dbErr } = await supabase
    .from("avv_partner")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}
