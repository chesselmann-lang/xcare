import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cols: (string | number | null | undefined)[]) {
  return cols.map(escapeCsv).join(",") + "\r\n";
}

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!profile || profile.role !== "anbieter") return new NextResponse("Forbidden", { status: 403 });

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("profile_id", profile.id)
    .single();
  if (!anbieter) return new NextResponse("Not found", { status: 404 });

  // Only open/in_bearbeitung anfragen (the "waitlist")
  const { data: anfragen } = await supabase
    .from("anfragen")
    .select(`
      id, lebenslage, status, beschreibung, created_at,
      profiles:familie_id(vorname, nachname, plz, ort),
      leistungen(name)
    `)
    .eq("anbieter_id", anbieter.id)
    .in("status", ["offen", "in_bearbeitung"])
    .order("created_at", { ascending: true });

  // Group by leistung name (or lebenslage if no leistung)
  const groups: Record<string, typeof anfragen> = {};
  for (const a of anfragen ?? []) {
    const leistungName = (a.leistungen as { name: string } | null)?.name ?? a.lebenslage;
    if (!groups[leistungName]) groups[leistungName] = [];
    groups[leistungName]!.push(a);
  }

  let csv = "";

  for (const [groupName, rows] of Object.entries(groups)) {
    // Section header
    csv += row([`Warteliste: ${groupName}`, "", "", "", "", "", ""]);
    csv += row(["Pos.", "Familie Name", "PLZ", "Ort", "Status", "Gemeldet am", "Beschreibung"]);

    rows?.forEach((a, idx) => {
      const fam = a.profiles as { vorname: string | null; nachname: string | null; plz: string | null; ort: string | null } | null;
      const name = [fam?.vorname, fam?.nachname].filter(Boolean).join(" ") || "–";
      const datum = new Date(a.created_at).toLocaleDateString("de-DE");
      const beschreibung = (a.beschreibung ?? "").slice(0, 200);
      csv += row([
        idx + 1,
        name,
        fam?.plz ?? "–",
        fam?.ort ?? "–",
        STATUS_LABEL[a.status] ?? a.status,
        datum,
        beschreibung,
      ]);
    });

    csv += "\r\n"; // blank separator between groups
  }

  if (!csv) {
    csv = row(["Hinweis"]);
    csv += row(["Aktuell keine offenen Anfragen auf der Warteliste."]);
  }

  // BOM for Excel UTF-8 compatibility
  const bom = "﻿";
  const date = new Date().toISOString().split("T")[0];
  const filename = `warteliste_${anbieter.name.replace(/\s+/g, "_")}_${date}.csv`;

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
