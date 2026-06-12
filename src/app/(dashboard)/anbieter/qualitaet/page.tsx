import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QualitaetClient } from "@/components/qualitaet/QualitaetClient";

export const metadata = { title: "Qualitätsindikatoren | xcare" };

export default async function QualitaetPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; kategorie?: string }>;
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

  if (!anbieter) redirect("/anbieter/dashboard");

  const { periode, kategorie } = await searchParams;

  // Default periode: current quarter
  const now = new Date();
  const defaultPeriode = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const activePeriode = periode ?? defaultPeriode;

  let query = supabase
    .from("qualitaetsindikatoren")
    .select("*")
    .eq("anbieter_id", anbieter.id)
    .eq("periode", activePeriode)
    .order("kategorie")
    .order("indikator");

  if (kategorie) query = query.eq("kategorie", kategorie as string);

  const { data: indikatoren } = await query;

  // Also load all distinct periods for the period selector
  const { data: perioden } = await supabase
    .from("qualitaetsindikatoren")
    .select("periode")
    .eq("anbieter_id", anbieter.id)
    .order("periode", { ascending: false });

  const uniquePerioden = Array.from(new Set((perioden ?? []).map((p) => p.periode)));
  if (!uniquePerioden.includes(activePeriode)) {
    uniquePerioden.unshift(activePeriode);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Qualitätsindikatoren-Dashboard</h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Erfassen und verfolgen Sie Qualitätskennzahlen nach MDK-Rahmen und Qualitätsprüfungs-Richtlinien
        </p>
      </div>
      <QualitaetClient
        indikatoren={indikatoren ?? []}
        perioden={uniquePerioden}
        activePeriode={activePeriode}
        activeKategorie={kategorie}
      />
    </div>
  );
}
