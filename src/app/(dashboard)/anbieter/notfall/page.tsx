import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotfallClient from "@/components/notfall/NotfallClient";

export default async function AnbieterNotfallPage({
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

  const [planRes, kontakteRes, familienRes] = await Promise.all([
    familieProfileId
      ? supabase.from("notfallplaene").select("*").eq("familie_profile_id", familieProfileId).eq("aktiv", true).single()
      : Promise.resolve({ data: null }),
    familieProfileId
      ? supabase.from("notfallkontakte").select("*").eq("familie_profile_id", familieProfileId).order("prioritaet")
      : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("id, vorname, nachname").eq("role", "familie"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notfallmanagement</h1>
        <p className="text-sm text-gray-500 mt-1">Notfallpläne und Kontakte Ihrer Familien</p>
      </div>

      {familienRes.data && familienRes.data.length > 0 && (
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">Familie:</label>
          <select
            defaultValue={familieProfileId ?? ""}
            onChange={(e) => { const url = new URL(window.location.href); if (e.target.value) url.searchParams.set("familie", e.target.value); else url.searchParams.delete("familie"); window.location.href = url.toString(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— auswählen</option>
            {familienRes.data.map((f) => (
              <option key={f.id} value={f.id}>{f.vorname} {f.nachname}</option>
            ))}
          </select>
        </div>
      )}

      {familieProfileId ? (
        <NotfallClient
          plan={planRes.data ?? null}
          kontakte={kontakteRes.data ?? []}
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
