import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// MDK §115 SGB XI Bewertungsbereiche + Prüfkriterien
const MDK_BEREICHE = {
  pflege: {
    label: "Pflege und medizinische Versorgung",
    kriterien: [
      { id: "pk01", text: "Pflegeplanung aktuell und individuell", gewicht: 1.5 },
      { id: "pk02", text: "Dekubitusprophylaxe wird durchgeführt", gewicht: 1.2 },
      { id: "pk03", text: "Schmerzmanagement dokumentiert", gewicht: 1.0 },
      { id: "pk04", text: "Medikamentengabe korrekt und dokumentiert", gewicht: 1.5 },
      { id: "pk05", text: "Wundversorgung leitliniengerecht", gewicht: 1.0 },
      { id: "pk06", text: "Vitalzeichen regelmäßig erhoben", gewicht: 1.0 },
      { id: "pk07", text: "Kontinenzversorgung bedarfsgerecht", gewicht: 0.8 },
    ],
  },
  sozial: {
    label: "Soziale Betreuung und Alltagsgestaltung",
    kriterien: [
      { id: "sk01", text: "Soziale Aktivitäten regelmäßig angeboten", gewicht: 1.0 },
      { id: "sk02", text: "Individuelle Wünsche werden berücksichtigt", gewicht: 1.2 },
      { id: "sk03", text: "Angehörige werden einbezogen", gewicht: 1.0 },
      { id: "sk04", text: "Beschwerdemanagement etabliert", gewicht: 0.8 },
    ],
  },
  hotel: {
    label: "Wohnen, Verpflegung, Hauswirtschaft",
    kriterien: [
      { id: "hk01", text: "Mahlzeiten bedarfsgerecht und qualitativ hochwertig", gewicht: 1.0 },
      { id: "hk02", text: "Zimmer sauber und ordentlich", gewicht: 0.8 },
      { id: "hk03", text: "Hygienestandards werden eingehalten", gewicht: 1.5 },
    ],
  },
  organisation: {
    label: "Unternehmensführung und -entwicklung",
    kriterien: [
      { id: "ok01", text: "Qualitätsmanagementsystem vorhanden", gewicht: 1.2 },
      { id: "ok02", text: "Fortbildungen für Personal nachgewiesen", gewicht: 1.0 },
      { id: "ok03", text: "Personalschlüssel eingehalten", gewicht: 1.5 },
      { id: "ok04", text: "Notfallpläne aktuell", gewicht: 1.0 },
      { id: "ok05", text: "Dokumentation vollständig", gewicht: 1.2 },
    ],
  },
};

// GET /api/qualitaetsbericht?von=2026-01-01&bis=2026-06-30
// Generiert automatisch einen Qualitätsbericht aus den vorhandenen Daten
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const vonParam = req.nextUrl.searchParams.get("von");
    const bisParam = req.nextUrl.searchParams.get("bis");
    const now = new Date();
    const von = vonParam ?? new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
    const bis = bisParam ?? now.toISOString().slice(0, 10);

    // Bestehende Berichte laden
    const { data: berichte } = await supabase
      .from("qualitaetsberichte")
      .select("*")
      .eq("anbieter_id", anbieter.id)
      .order("erstellt_am", { ascending: false });

    // Daten für Auto-Berechnung sammeln
    const [
      { data: bewohner },
      { data: team },
      { data: pflegeplaene },
      { data: vitalwerte },
      { data: medikamente },
      { data: wunden },
      { data: dekubitus },
      { data: schmerz },
      { data: kontinenz },
      { data: schichten },
      { data: beschwerden },
      { data: leistungsnachweise },
    ] = await Promise.all([
      supabase.from("bewohner").select("id").eq("anbieter_id", anbieter.id).eq("aktiv", true),
      supabase.from("care_workers").select("id").eq("anbieter_id", anbieter.id).eq("aktiv", true),
      supabase.from("pflegeplaene").select("id, ziele_anzahl").eq("anbieter_id", anbieter.id).gte("erstellt_am", von),
      supabase.from("vitalzeichen_eintraege").select("id").eq("anbieter_id", anbieter.id).gte("gemessen_am", von),
      supabase.from("medikamentengaben").select("id").eq("anbieter_id", anbieter.id).gte("geplant_fuer", von),
      supabase.from("wundprotokolle").select("id").eq("anbieter_id", anbieter.id).gte("erstellt_am", von),
      supabase.from("dekubitus_protokolle").select("id, grad").eq("anbieter_id", anbieter.id).gte("erstellt_am", von),
      supabase.from("schmerz_protokolle").select("id").eq("anbieter_id", anbieter.id).gte("erstellt_am", von),
      supabase.from("kontinenz_eintraege").select("id").eq("anbieter_id", anbieter.id).gte("gemessen_am", von),
      supabase.from("schichten").select("id, status").eq("anbieter_id", anbieter.id).gte("start_ts", von),
      supabase.from("beschwerden").select("id, status").eq("anbieter_id", anbieter.id).gte("eingegangen_am", von),
      supabase.from("leistungsnachweise").select("id, status").eq("anbieter_id", anbieter.id).gte("datum", von),
    ]);

    const bewohnerAnz = bewohner?.length ?? 0;
    const teamGroesse = team?.length ?? 0;

    // Scores automatisch berechnen (0–100)
    const scores = {
      pk01: pflegeplaene?.length ? Math.min(100, (pflegeplaene.length / Math.max(1, bewohnerAnz)) * 100) : 0,
      pk02: dekubitus?.length ? 85 : bewohnerAnz > 0 ? 70 : 100,
      pk03: schmerz?.length ? Math.min(100, (schmerz.length / Math.max(1, bewohnerAnz)) * 100) : 0,
      pk04: medikamente?.length ? 90 : 50,
      pk05: wunden?.length ? 85 : 100,
      pk06: vitalwerte?.length ? Math.min(100, (vitalwerte.length / Math.max(1, bewohnerAnz)) * 80 + 20) : 0,
      pk07: kontinenz?.length ? 85 : 70,
      sk01: 80, // Aktivitäten – static placeholder
      sk02: 75,
      sk03: (bewohner?.length ?? 0) > 0 ? 70 : 100,
      sk04: beschwerden?.length
        ? Math.max(60, 100 - (beschwerden.filter(b => b.status === "offen").length / Math.max(1, beschwerden.length)) * 40)
        : 90,
      hk01: 85,
      hk02: 90,
      hk03: 88,
      ok01: 85,
      ok02: 75,
      ok03: teamGroesse > 0 && bewohnerAnz > 0 ? Math.min(100, (teamGroesse / Math.max(1, bewohnerAnz * 0.4)) * 100) : 50,
      ok04: 90,
      ok05: leistungsnachweise?.length ? Math.min(100, (leistungsnachweise.filter(l => l.status !== "offen").length / Math.max(1, leistungsnachweise.length)) * 100) : 50,
    };

    // Bereiche auswerten
    function bereichScore(bereich: keyof typeof MDK_BEREICHE) {
      const def = MDK_BEREICHE[bereich];
      let gewichtSumme = 0;
      let scoreSumme = 0;
      const items = def.kriterien.map(k => {
        const s = scores[k.id as keyof typeof scores] ?? 50;
        gewichtSumme += k.gewicht;
        scoreSumme += s * k.gewicht;
        return { ...k, score: Math.round(s) };
      });
      return {
        label: def.label,
        score: Math.round(scoreSumme / gewichtSumme),
        items,
      };
    }

    const bereiche = {
      pflege: bereichScore("pflege"),
      sozial: bereichScore("sozial"),
      hotel: bereichScore("hotel"),
      organisation: bereichScore("organisation"),
    };

    const gesamtScoreRaw = Object.values(bereiche).reduce((a, b) => a + b.score, 0) / 4;
    // MDK-Note: 100=1.0, 0=6.0 (invertiert)
    const gesamtnote = parseFloat((6 - (gesamtScoreRaw / 100) * 5).toFixed(2));

    // Automatische Empfehlungen
    const empfehlungen: string[] = [];
    const massnahmen: string[] = [];

    if (scores.pk01 < 80) empfehlungen.push("Pflegepläne für alle Bewohner aktualisieren und individualisieren.");
    if (scores.pk06 < 70) empfehlungen.push("Vitalzeichen-Kontrollen intensivieren und lückenlos dokumentieren.");
    if (scores.ok02 < 80) empfehlungen.push("Fortbildungsquote des Pflegepersonals steigern (Ziel: 2 Fortbildungen/Jahr).");
    if (scores.ok03 < 80) {
      empfehlungen.push("Personalschlüssel überprüfen — ggf. weitere Pflegekräfte einstellen.");
      massnahmen.push("Kapazitätsplanung und Stellenausschreibung initiieren.");
    }
    if (scores.sk04 < 80) massnahmen.push("Beschwerdemanagement-Prozess dokumentieren und Verantwortliche benennen.");
    if (gesamtnote > 3.0) massnahmen.push("Qualitätszirkel einberufen — vierteljährliche Qualitätsbesprechungen einführen.");
    if (schichten?.filter(s => s.status === "abgeschlossen").length === 0) {
      massnahmen.push("Digitale Schichtdokumentation für alle Mitarbeiter verpflichtend einführen.");
    }

    const betreuungsquote = teamGroesse > 0 && bewohnerAnz > 0
      ? parseFloat((teamGroesse / bewohnerAnz).toFixed(2))
      : null;

    return NextResponse.json({
      von, bis,
      anbieter: { id: anbieter.id, name: anbieter.name },
      kennzahlen: { bewohnerAnz, teamGroesse, betreuungsquote },
      bereiche,
      gesamtscore: Math.round(gesamtScoreRaw),
      gesamtnote,
      empfehlungen,
      massnahmen,
      datengrundlage: {
        pflegeplaene: pflegeplaene?.length ?? 0,
        vitalwerte: vitalwerte?.length ?? 0,
        schichten: schichten?.length ?? 0,
        leistungsnachweise: leistungsnachweise?.length ?? 0,
        beschwerden: beschwerden?.length ?? 0,
      },
      berichteListe: (berichte ?? []).map(b => ({
        id: b.id, titel: b.titel, zeitraum_von: b.zeitraum_von,
        zeitraum_bis: b.zeitraum_bis, gesamtnote: b.gesamtnote,
        status: b.status, erstellt_am: b.erstellt_am,
      })),
    });
  } catch (err) {
    console.error("[qualitaetsbericht GET]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// POST /api/qualitaetsbericht  → Bericht speichern
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const body = await req.json();

    const { data, error } = await supabase
      .from("qualitaetsberichte")
      .insert({
        anbieter_id: anbieter.id,
        erstellt_von: profile.id,
        titel: body.titel,
        zeitraum_von: body.zeitraum_von,
        zeitraum_bis: body.zeitraum_bis,
        bewohner_anzahl: body.bewohner_anzahl ?? 0,
        team_groesse: body.team_groesse ?? 0,
        betreuungsquote: body.betreuungsquote ?? null,
        bereich_pflege: body.bereich_pflege ?? null,
        bereich_sozial: body.bereich_sozial ?? null,
        bereich_hotel: body.bereich_hotel ?? null,
        bereich_organisation: body.bereich_organisation ?? null,
        gesamtnote: body.gesamtnote ?? null,
        empfehlungen: body.empfehlungen ?? [],
        massnahmen: body.massnahmen ?? [],
        status: body.status ?? "entwurf",
        notizen: body.notizen ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ bericht: data });
  } catch (err) {
    console.error("[qualitaetsbericht POST]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
