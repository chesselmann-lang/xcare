import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ArbeitszeitClient from "@/components/arbeitszeit/ArbeitszeitClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Arbeitszeiterfassung | xcare" };

export default async function ArbeitszeitPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string; worker?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/");

  const sp = await searchParams;
  const heute = new Date().toISOString().slice(0, 10);
  const von = sp.von ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const bis = sp.bis ?? heute;

  // Load team workers for selector
  const { data: team } = await supabase
    .from("anbieter_team")
    .select("profile_id, profiles(vorname, nachname)")
    .eq("anbieter_id", anbieter.id);

  const workers = (team ?? [])
    .filter((t) => t.profiles)
    .map((t) => {
      const p = t.profiles as { vorname: string | null; nachname: string | null };
      return { id: t.profile_id as string, vorname: p.vorname ?? "", nachname: p.nachname ?? "" };
    });

  // Initial data
  let eintraege = [];
  {
    let query = supabase
      .from("arbeitszeit")
      .select("id, datum, beginn, ende, pause_min, taetigkeit, kategorie, status, notiz, created_at, care_worker_id")
      .eq("anbieter_id", anbieter.id)
      .gte("datum", von)
      .lte("datum", bis)
      .order("datum", { ascending: false })
      .order("beginn", { ascending: false })
      .limit(300);

    if (sp.worker) query = query.eq("care_worker_id", sp.worker);

    const { data } = await query;
    eintraege = data ?? [];
  }

  // Summary stats
  const stunden = eintraege.reduce((acc, e) => {
    if (!e.ende) return acc;
    const [bh, bm] = e.beginn.split(":").map(Number);
    const [eh, em] = e.ende.split(":").map(Number);
    const brutto = (eh * 60 + em) - (bh * 60 + bm);
    const netto = Math.max(0, brutto - (e.pause_min ?? 0));
    return acc + netto;
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Arbeitszeiterfassung</h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Digitaler Stundenachweis für Ihr Care-Team
        </p>
      </div>

      <ArbeitszeitClient
        eintraege={eintraege}
        workers={workers}
        gesamtMinuten={stunden}
        initialVon={von}
        initialBis={bis}
        initialWorker={sp.worker}
      />
    </div>
  );
}
