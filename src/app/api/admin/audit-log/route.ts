import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const typ = searchParams.get("typ"); // "anfragen" | "benachrichtigungen" | null
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "500", 10), 500);

  type LogEntry = {
    id: string;
    typ: string;
    beschreibung: string;
    profil_email: string | null;
    created_at: string;
  };

  const entries: LogEntry[] = [];

  if (!typ || typ === "benachrichtigungen") {
    const { data: benachrichtigungen } = await supabase
      .from("benachrichtigungen")
      .select(`
        id,
        titel,
        nachricht,
        created_at,
        profile_id,
        profiles ( email )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    for (const b of benachrichtigungen ?? []) {
      const profileData = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
      entries.push({
        id: b.id,
        typ: "benachrichtigung",
        beschreibung: `${b.titel ?? ""}: ${b.nachricht ?? ""}`.trim(),
        profil_email: (profileData as { email?: string } | null)?.email ?? null,
        created_at: b.created_at,
      });
    }
  }

  if (!typ || typ === "anfragen") {
    const { data: anfragen } = await supabase
      .from("anfragen")
      .select(`
        id,
        lebenslage,
        status,
        created_at,
        familie_id
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Resolve emails separately to avoid complex FK join ambiguity
    const familieIds = [...new Set((anfragen ?? []).map((a) => a.familie_id))];
    const emailMap = new Map<string, string>();
    if (familieIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", familieIds);
      for (const p of profileRows ?? []) emailMap.set(p.id, p.email);
    }

    for (const a of anfragen ?? []) {
      entries.push({
        id: a.id,
        typ: "anfrage",
        beschreibung: `Anfrage (${a.lebenslage?.replace(/_/g, " ") ?? ""}) – Status: ${a.status}`,
        profil_email: emailMap.get(a.familie_id) ?? null,
        created_at: a.created_at,
      });
    }
  }

  // Merge und sortieren nach created_at DESC
  entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const result = entries.slice(0, limit);

  return NextResponse.json(result);
}
