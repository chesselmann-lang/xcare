import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Escape special chars for iCal TEXT values
function icalEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Format a JS Date as iCal DATE-TIME (UTC)
function icalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Fold long lines at 75 octets (iCal spec)
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    const end = start === 0 ? 75 : start + 74;
    chunks.push(
      (start === 0 ? "" : " ") +
        new TextDecoder().decode(bytes.slice(start, end))
    );
    start = end;
  }
  return chunks.join("\r\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify the anbieter exists and is active
  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("id", id)
    .eq("aktiv", true)
    .single();

  if (!anbieter) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Fetch bestätigte Anfragen
  const { data: anfragen } = await supabase
    .from("anfragen")
    .select("id, lebenslage, nachricht, created_at, updated_at, profiles!familie_id(vorname, nachname)")
    .eq("anbieter_id", id)
    .in("status", ["bestaetigt", "abgeschlossen"])
    .order("updated_at", { ascending: false })
    .limit(100);

  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//xcare//Anbieter-Kalender//DE`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${icalEscape(anbieter.name)} – Anfragen`),
    "X-WR-TIMEZONE:Europe/Berlin",
  ];

  for (const a of anfragen ?? []) {
    const profile = a.profiles as { vorname: string | null; nachname: string | null } | null;
    const familieName = [profile?.vorname, profile?.nachname]
      .filter(Boolean)
      .join(" ") || "Familie";
    const lebenslage = (a.lebenslage as string).replace(/_/g, " ");
    const dtStart = new Date(a.updated_at as string);
    const dtEnd = new Date(dtStart.getTime() + 60 * 60 * 1000); // 1h duration
    const dtStamp = icalDate(now);

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:xcare-anfrage-${a.id}@xcare.de`));
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${icalDate(dtStart)}`);
    lines.push(`DTEND:${icalDate(dtEnd)}`);
    lines.push(foldLine(`SUMMARY:${icalEscape(`Anfrage: ${lebenslage} – ${familieName}`)}`));
    if (a.nachricht) {
      lines.push(foldLine(`DESCRIPTION:${icalEscape(String(a.nachricht).slice(0, 200))}`));
    }
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="xcare-kalender.ics"`,
      "Cache-Control": "no-cache, no-store",
    },
  });
}
