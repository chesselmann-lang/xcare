import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PinnwandClient from "@/components/pinnwand/PinnwandClient";

export default async function AnbieterPinnwandPage({
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

  const { familie } = await searchParams;
  const familieProfileId = familie;

  const { data: familien } = await supabase
    .from("profiles")
    .select("id, vorname, nachname")
    .eq("role", "familie");

  let eintraege = null;
  if (familieProfileId) {
    const { data } = await supabase
      .from("familie_pinnwand")
      .select(`id, typ, inhalt, erledigt, erledigt_am, pinned, erstellt_von_rolle, created_at,
        profiles!familie_pinnwand_erstellt_von_fkey (vorname, nachname)`)
      .eq("familie_profile_id", familieProfileId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    eintraege = data;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Familien-Pinnwand</h1>
        <p className="text-sm text-gray-500 mt-1">Nachrichten, Aufgaben und Notizen mit Ihren Familien teilen</p>
      </div>

      {familien && familien.length > 0 && (
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">Familie:</label>
          <select
            defaultValue={familieProfileId ?? ""}
            onChange={(e) => { const url = new URL(window.location.href); if (e.target.value) url.searchParams.set("familie", e.target.value); else url.searchParams.delete("familie"); window.location.href = url.toString(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— auswählen</option>
            {familien.map((f) => (
              <option key={f.id} value={f.id}>{f.vorname} {f.nachname}</option>
            ))}
          </select>
        </div>
      )}

      {familieProfileId ? (
        <PinnwandClient
          eintraege={eintraege ?? []}
          isAnbieter={true}
          familieProfileId={familieProfileId}
        />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Bitte wählen Sie eine Familie aus
        </div>
      )}
    </div>
  );
}
