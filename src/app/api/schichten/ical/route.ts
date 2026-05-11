import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

function icalDate(ts: string): string {
  return new Date(ts).toISOString().replace(/[-:]/g, "").replace(".000", "");
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * GET /api/schichten/ical?care_worker_id=&von=&bis=
 * Gibt eine iCal-Datei mit den Schichten zurück.
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
    const careWorkerId = url.searchParams.get("care_worker_id");
    const von = url.searchParams.get("von") ?? new Date(Date.now() - 7 * 86400000).toISOString();
    const bis = url.searchParams.get("bis") ?? new Date(Date.now() + 90 * 86400000).toISOString();

    let query = supabase
      .from("schichten")
      .select(`
        id, start_ts, ende_ts, titel, beschreibung, schichttyp, status,
        stunden_geplant, care_workers (vorname, nachname),
        profiles!schichten_familie_profile_id_fkey (vorname, nachname)
      `)
      .eq("anbieter_id", anbieter.id)
      .neq("status", "abgesagt")
      .gte("start_ts", von)
      .lte("start_ts", bis + "T23:59:59Z")
      .order("start_ts");

    if (careWorkerId) query = query.eq("care_worker_id", careWorkerId);

    const { data: schichten, error } = await query.limit(500);
    if (error) throw error;

    const now = icalDate(new Date().toISOString());
    const calName = escapeIcal(`${anbieter.name} – Schichtplan`);

    const events = (schichten ?? []).map(s => {
      const worker = s.care_workers as { vorname: string; nachname: string } | null;
      const familie = s.profiles as { vorname?: string; nachname?: string } | null;
      const summary = s.titel
        ? escapeIcal(s.titel)
        : worker ? escapeIcal(`Schicht: ${worker.vorname} ${worker.nachname}`) : "Schicht";
      const desc = [
        worker ? `Pflegekraft: ${worker.vorname} ${worker.nachname}` : null,
        familie ? `Pflegeperson: ${familie.vorname ?? ""} ${familie.nachname ?? ""}`.trim() : null,
        s.schichttyp ? `Typ: ${s.schichttyp}` : null,
        s.stunden_geplant ? `Geplante Stunden: ${Number(s.stunden_geplant).toFixed(1)}h` : null,
        s.beschreibung ?? null,
      ].filter(Boolean).join("\\n");

      return [
        "BEGIN:VEVENT",
        `UID:schicht-${s.id}@xcare`,
        `DTSTAMP:${now}`,
        `DTSTART:${icalDate(s.start_ts)}`,
        `DTEND:${icalDate(s.ende_ts)}`,
        `SUMMARY:${summary}`,
        desc ? `DESCRIPTION:${desc}` : null,
        `STATUS:${s.status === "bestaetigt" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT",
      ].filter(Boolean).join("\r\n");
    }).join("\r\n");

    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//xcare//Schichtplan//DE",
      `X-WR-CALNAME:${calName}`,
      "X-WR-TIMEZONE:Europe/Berlin",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      events,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="schichtplan_${Date.now()}.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    logger.error("schichten ical error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
