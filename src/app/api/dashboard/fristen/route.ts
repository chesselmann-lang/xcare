import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getDaysRemaining(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(days: number): "rot" | "gelb" | "gruen" {
  if (days < 30) return "rot";
  if (days < 90) return "gelb";
  return "gruen";
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Dokumente mit Ablaufdatum innerhalb der nächsten 90 Tage
  const { data: dokumente, error: dokumenteError } = await supabase
    .from("dokumente")
    .select("id, name, ablaufdatum, kategorie")
    .eq("profil_id", user.id)
    .not("ablaufdatum", "is", null)
    .lt("ablaufdatum", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
    .order("ablaufdatum", { ascending: true });

  if (dokumenteError) {
    return NextResponse.json({ error: dokumenteError.message }, { status: 500 });
  }

  // Impfungen mit nächster Impfung innerhalb der nächsten 90 Tage
  const { data: impfungen, error: impfungenError } = await supabase
    .from("impfungen")
    .select("id, impfstoff, naechste_impfung")
    .eq("profil_id", user.id)
    .not("naechste_impfung", "is", null)
    .lt("naechste_impfung", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
    .order("naechste_impfung", { ascending: true });

  if (impfungenError) {
    return NextResponse.json({ error: impfungenError.message }, { status: 500 });
  }

  // Medikamente mit Enddatum innerhalb der nächsten 90 Tage (nur aktive)
  const { data: medikamente, error: medikamenteError } = await supabase
    .from("medikamente")
    .select("id, name, bis_datum")
    .eq("profil_id", user.id)
    .eq("aktiv", true)
    .not("bis_datum", "is", null)
    .lt("bis_datum", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
    .order("bis_datum", { ascending: true });

  if (medikamenteError) {
    return NextResponse.json({ error: medikamenteError.message }, { status: 500 });
  }

  // Kombinierte Liste mit Dringlichkeit
  type FristItem = {
    id: string;
    name: string;
    datum: string;
    typ: "dokument" | "impfung" | "medikament";
    kategorie?: string;
    daysRemaining: number;
    urgency: "rot" | "gelb" | "gruen";
  };

  const fristen: FristItem[] = [
    ...(dokumente ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      datum: d.ablaufdatum,
      typ: "dokument" as const,
      kategorie: d.kategorie,
      daysRemaining: getDaysRemaining(d.ablaufdatum),
      urgency: getUrgency(getDaysRemaining(d.ablaufdatum)),
    })),
    ...(impfungen ?? []).map((i) => ({
      id: i.id,
      name: i.impfstoff,
      datum: i.naechste_impfung,
      typ: "impfung" as const,
      daysRemaining: getDaysRemaining(i.naechste_impfung),
      urgency: getUrgency(getDaysRemaining(i.naechste_impfung)),
    })),
    ...(medikamente ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      datum: m.bis_datum,
      typ: "medikament" as const,
      daysRemaining: getDaysRemaining(m.bis_datum),
      urgency: getUrgency(getDaysRemaining(m.bis_datum)),
    })),
  ].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return NextResponse.json({ fristen });
}
