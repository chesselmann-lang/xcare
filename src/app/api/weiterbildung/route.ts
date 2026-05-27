import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const kategorie = searchParams.get("kategorie");
    const format = searchParams.get("format");
    const maxPreis = searchParams.get("max_preis")
      ? parseFloat(searchParams.get("max_preis")!)
      : undefined;
    const nurFoerderung = searchParams.get("foerderung") === "true";
    const search = searchParams.get("q");

    let query = supabase
      .from("kurse")
      .select(
        `
        id, titel, beschreibung, kategorie, niveau, format, dauer_stunden,
        preis_regulaer, preis_foerderung, foerderung_moeglich, foerderung_info,
        zertifikat_erhalten, zertifikat_name, lernziele, naechste_termine,
        bewertung_schnitt, anzahl_bewertungen, bundesland, ort,
        kurs_anbieter(id, name, zertifizierungen, logo_url)
      `
      )
      .eq("aktiv", true);

    if (kategorie) query = query.eq("kategorie", kategorie);
    if (format) query = query.eq("format", format);
    if (nurFoerderung) query = query.eq("foerderung_moeglich", true);
    if (maxPreis) query = query.lte("preis_regulaer", maxPreis);
    if (search) query = query.ilike("titel", `%${search}%`);

    const { data, error } = await query
      .order("bewertung_schnitt", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(
      { kurse: data },
      { headers: { "Cache-Control": "public, s-maxage=600" } }
    );
  } catch (error) {
    logger.error("Weiterbildung GET error", { error });
    return NextResponse.json({ error: "Abruf fehlgeschlagen" }, { status: 500 });
  }
}
