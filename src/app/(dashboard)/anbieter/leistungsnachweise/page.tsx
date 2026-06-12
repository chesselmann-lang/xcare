import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeistungsnachweisteClient } from "@/components/leistungsnachweise/LeistungsnachweisteClient";
import { FileText } from "lucide-react";

export const metadata = { title: "Leistungsnachweise | xcare" };

export default async function LeistungsnachweisePage() {
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
    .select("id, name")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter/dashboard");

  // Load last 6 months of Leistungsnachweise
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const fromMonth = sixMonthsAgo.toISOString().slice(0, 7);

  const { data } = await supabase
    .from("leistungsnachweise")
    .select(`
      id, leistungsdatum, abrechnungsmonat, kunde_name, kunde_adresse,
      krankenkasse, versicherungsnummer, leistungsart, leistungsminuten,
      einheit, einzelpreis_ct, menge, gesamtbetrag_ct,
      status, eingereicht_am, genehmigt_am, abrechnungs_referenz,
      ik_anbieter, ik_kasse, notizen, bewohner_id, tour_einsatz_id, created_at
    `)
    .eq("anbieter_id", anbieter.id)
    .gte("abrechnungsmonat", fromMonth)
    .order("leistungsdatum", { ascending: false })
    .limit(500);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Leistungsnachweise</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            SGB XI Abrechnungs-Export & Leistungsdokumentation — {anbieter.name}
          </p>
        </div>
      </div>
      <LeistungsnachweisteClient initialData={data ?? []} />
    </div>
  );
}
