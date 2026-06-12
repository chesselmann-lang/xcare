import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PflegeplanungClient from "@/components/pflegeplanung/PflegeplanungClient";
import { FamilienSelector } from "@/components/pinnwand/FamilienSelector";

export const metadata = { title: "Pflegeplanung 2.0 | xcare" };

export default async function PflegeplanungPage({
  searchParams,
}: {
  searchParams: Promise<{ familie?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "anbieter") redirect("/");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  const { familie, status } = await searchParams;

  // Load families scoped to this anbieter's anfragen
  const { data: anfragenData } = anbieter
    ? await supabase
        .from("anfragen")
        .select("familie_profile_id, profiles!anfragen_familie_profile_id_fkey(id, vorname, nachname)")
        .eq("anbieter_id", anbieter.id)
    : { data: null };

  const uniqueFamilien = anfragenData
    ? Array.from(
        new Map(
          anfragenData
            .filter((a) => a.profiles)
            .map((a) => {
              const p = a.profiles as { id: string; vorname: string | null; nachname: string | null };
              return [p.id, p];
            })
        ).values()
      )
    : [];

  // Load pflegeziele for selected family
  let ziele = null;
  if (familie && anbieter) {
    const query = supabase
      .from("pflegeziele")
      .select(`
        id, titel, beschreibung, bereich, prioritaet, status, zieldatum, erreicht_am, created_at, updated_at,
        familie_profile_id,
        pflegeziel_massnahmen(id, beschreibung, haeufigkeit, verantwortlich, erledigt, erledigt_am, sort_order),
        pflegeziel_evaluationen(id, datum, ergebnis, notiz, created_at)
      `)
      .eq("anbieter_id", anbieter.id)
      .eq("familie_profile_id", familie)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data } = status ? await query.eq("status", status) : await query;
    ziele = data;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Pflegeplanung 2.0</h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Pflegeziele, Maßnahmen & Evaluation für Ihre Klienten
        </p>
      </div>

      {uniqueFamilien.length > 0 ? (
        <FamilienSelector familien={uniqueFamilien} selectedId={familie} />
      ) : (
        <p className="text-sm text-[--muted-foreground]">Noch keine Familien mit Anfragen gefunden.</p>
      )}

      {familie ? (
        <PflegeplanungClient
          ziele={ziele ?? []}
          familieProfileId={familie}
          initialStatus={status}
        />
      ) : (
        <div className="bg-[--muted] border border-[--border] rounded-2xl p-10 text-center">
          <p className="text-sm text-[--muted-foreground]">
            Bitte wählen Sie eine Familie aus, um die Pflegeplanung anzuzeigen.
          </p>
        </div>
      )}
    </div>
  );
}
