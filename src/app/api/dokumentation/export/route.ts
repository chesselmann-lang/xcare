import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const KATEGORIE_LABELS: Record<string, string> = {
  allgemein: "Allgemein",
  koerperpflege: "Körperpflege",
  ernaehrung: "Ernährung",
  "mobilität": "Mobilität",
  medikamente: "Medikamente",
  vitalwerte: "Vitalwerte",
  wunde: "Wundversorgung",
  psychosozial: "Psychosozial",
  sonstiges: "Sonstiges",
};

/**
 * GET /api/dokumentation/export?familie_profile_id=&von=&bis=
 * Generiert einen HTML-Pflegebericht (druckoptimiert / MDK-konform).
 * Anbieter-only.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter") {
      return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const url = new URL(req.url);
    const familieId = url.searchParams.get("familie_profile_id");
    const von = url.searchParams.get("von");
    const bis = url.searchParams.get("bis");

    // Pflegeperson-Profil laden
    let familieProfile: { vorname?: string; nachname?: string } | null = null;
    if (familieId) {
      const { data } = await supabase
        .from("profiles").select("vorname, nachname").eq("id", familieId).single();
      familieProfile = data;
    }

    let query = supabase
      .from("pflegedokumentation")
      .select(`
        id, kategorie, titel, inhalt, ereignis_datum, created_at,
        blutdruck_sys, blutdruck_dia, puls, temperatur, gewicht, blutzucker, sauerstoff,
        medikament_name, medikament_dosis, medikament_gegeben,
        unterschrieben, unterschrift_ts,
        care_workers (vorname, nachname),
        profiles!pflegedokumentation_erstellt_von_fkey (vorname, nachname)
      `)
      .eq("anbieter_id", anbieter.id)
      .order("ereignis_datum", { ascending: true });

    if (familieId) query = query.eq("familie_profile_id", familieId);
    if (von) query = query.gte("ereignis_datum", von);
    if (bis) query = query.lte("ereignis_datum", bis + "T23:59:59Z");

    const { data: eintraege, error } = await query;
    if (error) throw error;

    const pflegeperson = familieProfile
      ? `${familieProfile.vorname ?? ""} ${familieProfile.nachname ?? ""}`.trim()
      : "Alle Pflegepersonen";

    const zeitraum = von && bis
      ? `${new Date(von).toLocaleDateString("de-DE")} – ${new Date(bis).toLocaleDateString("de-DE")}`
      : "Gesamter Zeitraum";

    const heute = new Date().toLocaleDateString("de-DE", {
      year: "numeric", month: "long", day: "numeric",
    });

    // Einträge nach Kategorie gruppieren
    const grouped = (eintraege ?? []).reduce<Record<string, typeof eintraege>>((acc, e) => {
      const k = e.kategorie;
      if (!acc[k]) acc[k] = [];
      acc[k].push(e);
      return acc;
    }, {});

    const renderVitalwerte = (e: (typeof eintraege)[0]) => {
      const werte: string[] = [];
      if (e.blutdruck_sys && e.blutdruck_dia) werte.push(`RR: ${e.blutdruck_sys}/${e.blutdruck_dia} mmHg`);
      if (e.puls) werte.push(`Puls: ${e.puls} bpm`);
      if (e.temperatur) werte.push(`Temp: ${e.temperatur} °C`);
      if (e.gewicht) werte.push(`Gewicht: ${e.gewicht} kg`);
      if (e.blutzucker) werte.push(`BZ: ${e.blutzucker} mg/dL`);
      if (e.sauerstoff) werte.push(`SpO₂: ${e.sauerstoff}%`);
      return werte.length ? `<p class="vw">${werte.join(" &nbsp;|&nbsp; ")}</p>` : "";
    };

    const renderMedikament = (e: (typeof eintraege)[0]) => {
      if (!e.medikament_name) return "";
      const gegeben = e.medikament_gegeben ? "✓ verabreicht" : "✗ nicht verabreicht";
      return `<p class="med"><strong>${e.medikament_name}</strong> ${e.medikament_dosis ?? ""} — <em>${gegeben}</em></p>`;
    };

    const rows = Object.entries(grouped).map(([kat, entries]) => {
      const eintraegeHtml = entries.map(e => {
        const erstelltVon = (e.profiles as { vorname?: string; nachname?: string } | null);
        const worker = (e.care_workers as { vorname?: string; nachname?: string } | null);
        const datum = new Date(e.ereignis_datum).toLocaleString("de-DE");
        const sign = e.unterschrieben
          ? `<span class="sig">✓ Signiert ${e.unterschrift_ts ? new Date(e.unterschrift_ts).toLocaleDateString("de-DE") : ""}</span>`
          : `<span class="unsig">Unsigniert</span>`;
        const verfasser = worker
          ? `${worker.vorname} ${worker.nachname}`
          : erstelltVon
            ? `${erstelltVon.vorname ?? ""} ${erstelltVon.nachname ?? ""}`.trim()
            : "–";
        return `
          <tr>
            <td class="datum">${datum}</td>
            <td>
              ${e.titel ? `<strong>${e.titel}</strong><br>` : ""}
              <span class="inhalt">${e.inhalt.replace(/\n/g, "<br>")}</span>
              ${renderVitalwerte(e)}
              ${renderMedikament(e)}
            </td>
            <td class="meta">${verfasser}<br>${sign}</td>
          </tr>`;
      }).join("");

      return `
        <div class="section">
          <h3>${KATEGORIE_LABELS[kat] ?? kat}</h3>
          <table>
            <thead><tr><th>Zeitpunkt</th><th>Eintrag</th><th>Verfasser</th></tr></thead>
            <tbody>${eintraegeHtml}</tbody>
          </table>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Pflegebericht — ${pflegeperson}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 20mm; }
  h1 { font-size: 18pt; color: #1e3a5f; margin-bottom: 4px; }
  h2 { font-size: 11pt; color: #555; font-weight: normal; margin-bottom: 2px; }
  .meta-block { margin: 16px 0 24px; padding: 12px; border: 1px solid #ccc; background: #f8f9fa; }
  .meta-block p { line-height: 1.8; font-size: 10pt; }
  h3 { font-size: 12pt; color: #1e3a5f; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #1e3a5f; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-size: 9pt; }
  td { border: 1px solid #ddd; padding: 7px 8px; vertical-align: top; font-size: 10pt; line-height: 1.5; }
  td.datum { white-space: nowrap; width: 120px; color: #555; }
  td.meta { width: 140px; font-size: 9pt; color: #555; }
  .inhalt { color: #222; }
  .vw { margin-top: 6px; font-size: 9pt; background: #e8f4ff; padding: 3px 6px; border-radius: 4px; }
  .med { margin-top: 6px; font-size: 9pt; background: #fff3e0; padding: 3px 6px; border-radius: 4px; }
  .sig { color: #2e7d32; font-size: 8pt; }
  .unsig { color: #f57c00; font-size: 8pt; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 8pt; color: #888; }
  @media print { body { padding: 10mm; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
<h1>Digitaler Pflegebericht</h1>
<h2>MDK-konform gemäß §§ 113 ff. SGB XI</h2>

<div class="meta-block">
  <p><strong>Pflegeperson:</strong> ${pflegeperson}</p>
  <p><strong>Anbieter:</strong> ${anbieter.name}</p>
  <p><strong>Berichtszeitraum:</strong> ${zeitraum}</p>
  <p><strong>Anzahl Einträge:</strong> ${(eintraege ?? []).length}</p>
  <p><strong>Erstellt am:</strong> ${heute}</p>
</div>

${rows || '<p style="color:#999;text-align:center;padding:40px">Keine Einträge im gewählten Zeitraum.</p>'}

<div class="footer">
  Dieser Bericht wurde automatisch durch xcare generiert. Alle Einträge entsprechen dem Stand der digitalen Pflegedokumentation.
  Signierte Einträge sind unveränderlich archiviert. — xcare Pflegemanagement-Plattform
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="pflegebericht_${Date.now()}.html"`,
      },
    });
  } catch (err) {
    logger.error("dokumentation export error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
