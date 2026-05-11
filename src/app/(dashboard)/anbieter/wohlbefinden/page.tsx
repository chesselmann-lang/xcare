import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WohlbefindenClient from "@/components/wohlbefinden/WohlbefindenClient";

export default async function AnbieterWohlbefindenPage({
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
  const familieProfileId = familie ?? undefined;

  let query = supabase
    .from("wohlbefinden")
    .select("id, erfasst_am, schlaf, schmerz, stimmung, mobilitaet, appetit, notiz, erfasst_von_rolle, familie_profile_id")
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("erfasst_am", { ascending: false })
    .limit(90);

  if (familieProfileId) query = query.eq("familie_profile_id", familieProfileId);

  const [{ data: eintraege }, { data: familien }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("id, vorname, nachname")
      .eq("role", "familie"),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wohlbefinden</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wohlbefindens-Tracking Ihrer betreuten Familien
        </p>
      </div>

      {familien && familien.length > 0 && (
        <div>
          <form className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Familie:</label>
            <select name="familie" defaultValue={familieProfileId ?? ""}
              onChange={(e) => { const url = new URL(window.location.href); if (e.target.value) url.searchParams.set("familie", e.target.value); else url.searchParams.delete("familie"); window.location.href = url.toString(); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Alle Familien</option>
              {familien.map((f) => (
                <option key={f.id} value={f.id}>{f.vorname} {f.nachname}</option>
              ))}
            </select>
          </form>
        </div>
      )}

      <WohlbefindenClient
        eintraege={eintraege ?? []}
        isAnbieter={true}
        familieProfileId={familieProfileId}
      />
    </div>
  );
}
