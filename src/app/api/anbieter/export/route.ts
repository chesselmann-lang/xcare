import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planFeatureGate } from "@/lib/stripe/features";

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

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile || profile.role !== "anbieter") return new NextResponse("Forbidden", { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id, name, plan").eq("profile_id", profile.id).single();
    if (!anbieter) return new NextResponse("Not found", { status: 404 });

    // Feature gate: CSV export requires Starter plan or higher
    const gate = planFeatureGate(anbieter.plan);
    if (!gate.canExportCsv) {
      return NextResponse.json(
        { error: "CSV-Export erfordert den Starter-Plan oder höher.", upgrade_url: "/anbieter/abo" },
        { status: 403 }
      );
    }

    const { data: anfragen } = await supabase
      .from("anfragen")
      .select("id, lebenslage, status, beschreibung, created_at, updated_at, profiles:familie_id(vorname, nachname, email, plz, ort), leistungen(name)")
      .eq("anbieter_id", anbieter.id)
      .order("created_at", { ascending: false });

    // Build CSV
    let csv = row([
      "Anfrage-ID", "Lebenslage", "Leistung", "Status",
      "Familie Name", "Familie E-Mail", "PLZ", "Ort",
      "Erstellt am", "Aktualisiert am", "Beschreibung"
    ]);

    for (const a of anfragen ?? []) {
      const fam = a.profiles as { vorname: string | null; nachname: string | null; email: string; plz: string | null; ort: string | null } | null;
      const leistung = a.leistungen as { name: string } | null;
      csv += row([
        a.id.slice(0, 8).toUpperCase(),
        a.lebenslage.replace(/_/g, " "),
        leistung?.name ?? "",
        a.status.replace(/_/g, " "),
        fam ? `${fam.vorname ?? ""} ${fam.nachname ?? ""}`.trim() : "",
        fam?.email ?? "",
        fam?.plz ?? "",
        fam?.ort ?? "",
        new Date(a.created_at).toLocaleDateString("de-DE"),
        new Date(a.updated_at).toLocaleDateString("de-DE"),
        a.beschreibung ?? "",
      ]);
    }

    const filename = `xcare-anfragen-${anbieter.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[anbieter/export] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
