import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", prof?.id ?? "")
    .single();
  return (data as any)?.id ?? null;
}

// GET /api/bewohner/[id]/biografie
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: biografie, error } = await (supabase as any)
      .from("bewohner_biografien")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieterId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ biografie });
  } catch (err) {
    logger.error("GET /api/bewohner/[id]/biografie", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/bewohner/[id]/biografie  (upsert)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    const { data, error } = await (supabase as any)
      .from("bewohner_biografien")
      .upsert(
        {
          anbieter_id: anbieterId,
          bewohner_id: bewohnerId,
          zuletzt_aktualisiert_von: user.id,
          ...body,
        },
        { onConflict: "bewohner_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ biografie: data });
  } catch (err) {
    logger.error("PUT /api/bewohner/[id]/biografie", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
