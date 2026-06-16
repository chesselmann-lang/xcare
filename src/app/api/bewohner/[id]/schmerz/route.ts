import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const url = new URL(request.url);
  const since =
    url.searchParams.get("since") ??
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [eintraegeRes, latestAssessmentRes] = await Promise.all([
    (supabase as any)
      .from("schmerz_eintraege")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", (anbieter as any).id)
      .gte("datum", since)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false }),
    (supabase as any)
      .from("schmerz_assessments")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", (anbieter as any).id)
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const eintraege = (eintraegeRes.data ?? []) as any[];
  const latestAssessment = latestAssessmentRes.data ?? null;

  const nrsWerte = eintraege.map((e: any) => e.nrs_wert as number);
  const avgNrs =
    nrsWerte.length > 0
      ? Math.round((nrsWerte.reduce((a, b) => a + b, 0) / nrsWerte.length) * 10) / 10
      : null;
  const maxNrs = nrsWerte.length > 0 ? Math.max(...nrsWerte) : null;
  const hochschmerzEintraege = eintraege.filter((e: any) => e.nrs_wert >= 7).length;

  const stats = {
    gesamt: eintraege.length,
    avgNrs,
    maxNrs,
    hochschmerzEintraege,
    mitMedikament: eintraege.filter((e: any) => e.medikament_gegeben).length,
    letzterEintrag: eintraege.length > 0 ? eintraege[0].datum : null,
  };

  return NextResponse.json({ eintraege, latestAssessment, stats });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const body = await request.json();
  const anbieterId = (anbieter as any).id;

  if (body.type === "assessment") {
    const { type: _t, ...assessmentData } = body;
    const { data, error } = await (supabase as any)
      .from("schmerz_assessments")
      .insert({ ...assessmentData, bewohner_id: bewohnerId, anbieter_id: anbieterId, erfasst_von: user.id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assessment: data }, { status: 201 });
  }

  // Default: schmerz_eintraege
  if (body.nrs_wert === undefined || body.nrs_wert === null) {
    return NextResponse.json({ error: "NRS-Wert ist erforderlich" }, { status: 400 });
  }

  const { type: _t, ...eintragData } = body;
  const { data, error } = await (supabase as any)
    .from("schmerz_eintraege")
    .insert({ ...eintragData, bewohner_id: bewohnerId, anbieter_id: anbieterId, erfasst_von: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ eintrag: data }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const url = new URL(request.url);
  const eintragId = url.searchParams.get("eintrag_id");
  if (!eintragId) return NextResponse.json({ error: "eintrag_id fehlt" }, { status: 400 });

  const { error } = await (supabase as any)
    .from("schmerz_eintraege")
    .delete()
    .eq("id", eintragId)
    .eq("bewohner_id", bewohnerId)
    .eq("anbieter_id", (anbieter as any).id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
