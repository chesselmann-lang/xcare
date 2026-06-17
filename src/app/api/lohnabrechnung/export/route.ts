import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// GET /api/lohnabrechnung/export?monat=2026-06&format=datev|lodas|simple
// Generiert DATEV LODAS-kompatiblen CSV-Export
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
      .from("anbieter").select("id, name, steuernummer").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Profil" }, { status: 404 });

    const monat = req.nextUrl.searchParams.get("monat") ?? new Date().toISOString().slice(0, 7);
    const format = req.nextUrl.searchParams.get("format") ?? "simple";
    const periodeStart = `${monat}-01`;

    // Lohnperioden mit Care-Worker-Daten
    const { data: perioden } = await supabase
      .from("lohnperioden")
      .select(`
        *,
        care_workers(id, vorname, nachname, stundensatz_ct, personalnummer, steuer_id)
      `)
      .eq("anbieter_id", anbieter.id)
      .eq("periode_start", periodeStart)
      .order("care_worker_id");

    if (!perioden?.length) {
      return NextResponse.json({ error: "Keine Daten für diesen Monat" }, { status: 404 });
    }

    const [year, month] = monat.split("-");
    let csv = "";
    const filename = `lohnabrechnung_${monat}_${anbieter.name.replace(/\s+/g, "_")}.csv`;

    if (format === "datev") {
      // DATEV LODAS Format (vereinfacht)
      csv += "DATEV LODAS Export\n";
      csv += `Mandant;${anbieter.name};Steuernummer;${anbieter.steuernummer ?? ""}\n`;
      csv += `Abrechnungszeitraum;${month}/${year}\n\n`;
      csv += "Personalnummer;Nachname;Vorname;Stunden;Stundenlohn €;Grundlohn €;Zuschläge €;Bruttolohn €\n";

      for (const p of perioden) {
        const cw = p.care_workers as { vorname: string; nachname: string; stundensatz_ct?: number; personalnummer?: string };
        const grundlohn = (p.brutto_ct - p.zuschlaege_ct) / 100;
        csv += [
          cw?.personalnummer ?? "",
          cw?.nachname ?? "",
          cw?.vorname ?? "",
          p.stunden_geplant.toString().replace(".", ","),
          ((cw?.stundensatz_ct ?? 0) / 100).toFixed(2).replace(".", ","),
          grundlohn.toFixed(2).replace(".", ","),
          (p.zuschlaege_ct / 100).toFixed(2).replace(".", ","),
          (p.brutto_ct / 100).toFixed(2).replace(".", ","),
        ].join(";") + "\n";
      }
    } else if (format === "lodas") {
      // Simplified LODAS-compatible
      csv += `# LODAS Export ${monat} — ${anbieter.name}\n`;
      csv += "LohnartNr;MitarbeiterNr;Bezeichnung;Menge;Betrag\n";
      for (const p of perioden) {
        const cw = p.care_workers as { vorname: string; nachname: string; personalnummer?: string };
        const nr = cw?.personalnummer ?? p.care_worker_id.slice(0, 8);
        const name = `${cw?.nachname ?? ""}, ${cw?.vorname ?? ""}`;
        csv += `100;${nr};Grundlohn ${name};${p.stunden_geplant.toString().replace(".", ",")};${((p.brutto_ct - p.zuschlaege_ct) / 100).toFixed(2).replace(".", ",")}\n`;
        if (p.zuschlaege_ct > 0) {
          csv += `200;${nr};Zuschläge ${name};1;${(p.zuschlaege_ct / 100).toFixed(2).replace(".", ",")}\n`;
        }
      }
    } else {
      // Einfaches Format
      csv += `Lohnabrechnung ${month}/${year} — ${anbieter.name}\n`;
      csv += "Mitarbeiter;Schichten;Stunden;Stundensatz €;Grundlohn €;Zuschläge €;Brutto €;Status\n";
      for (const p of perioden) {
        const cw = p.care_workers as { vorname: string; nachname: string; stundensatz_ct?: number };
        csv += [
          `${cw?.nachname ?? ""} ${cw?.vorname ?? ""}`,
          p.schichten_anzahl,
          p.stunden_geplant.toString().replace(".", ","),
          ((cw?.stundensatz_ct ?? 0) / 100).toFixed(2).replace(".", ","),
          ((p.brutto_ct - p.zuschlaege_ct) / 100).toFixed(2).replace(".", ","),
          (p.zuschlaege_ct / 100).toFixed(2).replace(".", ","),
          (p.brutto_ct / 100).toFixed(2).replace(".", ","),
          p.status,
        ].join(";") + "\n";
      }
      // Summenzeile
      const totalBrutto = perioden.reduce((a, p) => a + p.brutto_ct, 0);
      const totalStunden = perioden.reduce((a, p) => a + Number(p.stunden_geplant), 0);
      csv += `GESAMT;;${totalStunden.toFixed(2).replace(".", ",")};;;${(totalBrutto / 100).toFixed(2).replace(".", ",")};\n`;
    }

    // Exportiert-Zeitstempel setzen
    await supabase
      .from("lohnperioden")
      .update({ exportiert_am: new Date().toISOString(), export_datei: filename })
      .eq("anbieter_id", anbieter.id)
      .eq("periode_start", periodeStart);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logger.error("[lohnabrechnung export]", { error: err });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
