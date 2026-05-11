import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify caller is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const adminEmail = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";
    if (caller?.role !== "admin" && user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all profiles with anbieter details where applicable
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, vorname, nachname, role, created_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch anbieter data for enrichment
    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("user_id, name, ort, plz, telefon, aktiv, verifiziert");

    const anbieterMap = new Map((anbieter ?? []).map((a) => [a.user_id, a]));

    // Build CSV rows
    const headers = [
      "ID",
      "E-Mail",
      "Vorname",
      "Nachname",
      "Rolle",
      "Registriert am",
      "Anbieter-Name",
      "Ort",
      "PLZ",
      "Telefon",
      "Aktiv",
      "Verifiziert",
    ];

    const escape = (val: string | null | undefined | boolean): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = (profiles ?? []).map((p) => {
      const a = anbieterMap.get(p.id);
      return [
        escape(p.id),
        escape(p.email),
        escape(p.vorname),
        escape(p.nachname),
        escape(p.role),
        escape(new Date(p.created_at).toLocaleDateString("de-DE")),
        escape(a?.name),
        escape(a?.ort),
        escape(a?.plz),
        escape(a?.telefon),
        escape(a ? (a.aktiv ? "Ja" : "Nein") : ""),
        escape(a ? (a.verifiziert ? "Ja" : "Nein") : ""),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="xcare-nutzer-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("[admin/nutzer-export] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
