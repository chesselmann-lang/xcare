import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const adminEmail = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";
  if (profile?.role !== "admin" && user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    { data: avvPartner },
    { data: loeschanfragenOffen },
    { data: loeschanfragenErledigt },
    { count: nutzerGesamt },
    { count: nutzerAktiv30 },
  ] = await Promise.all([
    supabase.from("avv_partner").select("avv_unterzeichnet"),
    supabase.from("dsgvo_loeschanfragen").select("id").in("status", ["offen", "in_bearbeitung"]),
    supabase.from("dsgvo_loeschanfragen").select("id").eq("status", "erledigt"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const avvGesamt = avvPartner?.length ?? 0;
  const avvUnterzeichnet = avvPartner?.filter((p) => p.avv_unterzeichnet).length ?? 0;
  const avvOffen = avvGesamt - avvUnterzeichnet;

  return NextResponse.json({
    avv: {
      gesamt: avvGesamt,
      unterzeichnet: avvUnterzeichnet,
      offen: avvOffen,
    },
    dsgvo: {
      loeschanfragen_offen: loeschanfragenOffen?.length ?? 0,
      loeschanfragen_erledigt: loeschanfragenErledigt?.length ?? 0,
    },
    nutzer: {
      gesamt: nutzerGesamt ?? 0,
      mit_2fa: 0,
      aktiv_30tage: nutzerAktiv30 ?? 0,
    },
    plattform: {
      letzte_migration: "2026-05-11",
      version: "v2.0.0",
    },
  });
}
