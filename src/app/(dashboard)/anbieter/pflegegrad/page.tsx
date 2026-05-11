import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PflegegradClient from "@/components/pflegegrad/PflegegradClient";

export default async function AnbieterPflegegradPage({
  searchParams,
}: {
  searchParams: Promise<{ familie?: string }>;
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

  const { familie } = await searchParams;
  const familieProfileId = familie;

  let query = supabase
    .from("pflegegrad_einschaetzungen")
    .select("id, einschaetzung_datum, aktueller_pflegegrad, pflegegrad_empfehlung, gesamtpunkte, notizen, familie_profile_id")
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("einschaetzung_datum", { ascending: false })
    .limit(20);

  if (familieProfileId) query = query.eq("familie_profile_id", familieProfileId);

  const [{ data: eintraege }, { data: familien }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, vorname, nachname").eq("role", "familie"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pflegegrad-Einschätzung</h1>
        <p className="text-sm text-gray-500 mt-1">NBI-Einschätzung für Ihre Familien (§ 15 SGB XI)</p>
      </div>

      {familien && familien.length > 0 && (
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">Familie:</label>
          <select
            defaultValue={familieProfileId ?? ""}
            onChange={(e) => { const url = new URL(window.location.href); if (e.target.value) url.searchParams.set("familie", e.target.value); else url.searchParams.delete("familie"); window.location.href = url.toString(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Alle Familien</option>
            {familien.map((f) => (
              <option key={f.id} value={f.id}>{f.vorname} {f.nachname}</option>
            ))}
          </select>
        </div>
      )}

      <PflegegradClient
        eintraege={eintraege ?? []}
        isAnbieter={true}
        familieProfileId={familieProfileId}
      />
    </div>
  );
}
