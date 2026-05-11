import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  // Fetch all anfragen with joined familie + anbieter names
  const { data: anfragen, error } = await supabase
    .from("anfragen")
    .select(`
      id, status, lebenslage, beschreibung, created_at, updated_at,
      familie:profiles!familie_id(vorname, nachname, email),
      anbieter(name)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const LEBENSLAGE_LABELS: Record<string, string> = {
    geburt_fruehe_kindheit:    "Geburt & frühe Kindheit",
    schulkind_jugend:          "Schulkind & Jugend",
    eingliederung_behinderung: "Eingliederung & Behinderung",
    erwerbsleben_vereinbarkeit:"Erwerbsleben & Vereinbarkeit",
    krankheit_genesung:        "Krankheit & Genesung",
    alter_pflege:              "Alter & Pflege",
    hospiz_palliativ:          "Hospiz & Palliativ",
    trauer_nachlass:           "Trauer & Nachlass",
  };

  const STATUS_LABELS: Record<string, string> = {
    offen:          "Offen",
    in_bearbeitung: "In Bearbeitung",
    angeboten:      "Angeboten",
    bestaetigt:     "Bestätigt",
    abgelehnt:      "Abgelehnt",
    abgeschlossen:  "Abgeschlossen",
  };

  const escape = (val: string | null | undefined | number): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    "ID",
    "Status",
    "Lebenslage",
    "Familie",
    "Familie E-Mail",
    "Anbieter",
    "Erstellt am",
    "Aktualisiert am",
    "Beschreibung",
  ];

  const rows = (anfragen ?? []).map((a) => {
    const familie = Array.isArray(a.familie) ? a.familie[0] : a.familie;
    const familieObj = familie as { vorname?: string | null; nachname?: string | null; email?: string | null } | null;
    const familieName = familieObj
      ? `${familieObj.vorname ?? ""} ${familieObj.nachname ?? ""}`.trim() || ""
      : "";
    const anbieter = a.anbieter as { name?: string } | null;

    // Truncate beschreibung to 200 chars for CSV readability
    const beschreibung = a.beschreibung ? a.beschreibung.slice(0, 200) : "";

    return [
      escape(a.id),
      escape(STATUS_LABELS[a.status] ?? a.status),
      escape(LEBENSLAGE_LABELS[a.lebenslage] ?? a.lebenslage),
      escape(familieName),
      escape(familieObj?.email),
      escape(anbieter?.name),
      escape(new Date(a.created_at).toLocaleDateString("de-DE")),
      escape(new Date(a.updated_at).toLocaleDateString("de-DE")),
      escape(beschreibung),
    ].join(",");
  });

  const csv = "﻿" + [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="xcare-anfragen-${date}.csv"`,
    },
  });
}
