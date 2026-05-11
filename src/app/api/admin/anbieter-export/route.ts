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

    // Fetch all anbieter with profile email
    const { data: anbieter, error } = await supabase
      .from("anbieter")
      .select("id, name, ort, plz, telefon, webseite, aktiv, verifiziert, created_at, user_id, profiles(email)")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch leistungen counts per anbieter
    const { data: leistungen } = await supabase
      .from("leistungen")
      .select("anbieter_id");

    const leistungMap = new Map<string, number>();
    for (const l of leistungen ?? []) {
      leistungMap.set(l.anbieter_id, (leistungMap.get(l.anbieter_id) ?? 0) + 1);
    }

    const escape = (val: string | null | undefined | boolean | number): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "ID",
      "Name",
      "E-Mail",
      "Ort",
      "PLZ",
      "Telefon",
      "Webseite",
      "Aktiv",
      "Verifiziert",
      "Leistungen",
      "Registriert am",
    ];

    const rows = (anbieter ?? []).map((a) => {
      const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
      return [
        escape(a.id),
        escape(a.name),
        escape((profile as { email?: string } | null)?.email),
        escape(a.ort),
        escape(a.plz),
        escape(a.telefon),
        escape(a.webseite),
        escape(a.aktiv ? "Ja" : "Nein"),
        escape(a.verifiziert ? "Ja" : "Nein"),
        escape(leistungMap.get(a.id) ?? 0),
        escape(new Date(a.created_at).toLocaleDateString("de-DE")),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="xcare-anbieter-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("[admin/anbieter-export] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
