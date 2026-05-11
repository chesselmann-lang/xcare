import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WundversorgungClient from "@/components/wundversorgung/WundversorgungClient";

export default async function AnbieterWundversorgungPage({
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

  const [versorgungRes, familienRes] = await Promise.all([
    familieProfileId
      ? supabase.from("wundversorgungen").select("*").eq("anbieter_id", anbieter?.id ?? "").eq("familie_profile_id", familieProfileId).order("created_at", { ascending: false }).limit(100)
      : supabase.from("wundversorgungen").select("*").eq("anbieter_id", anbieter?.id ?? "").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, vorname, nachname").eq("role", "familie"),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wundversorgung</h1>
        <p className="text-sm text-gray-500 mt-1">Wunddokumentation und -verlauf nach MDK-Standard</p>
      </div>

      {familienRes.data && familienRes.data.length > 0 && (
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">Familie:</label>
          <select
            defaultValue={familieProfileId ?? ""}
            onChange={(e) => { const url = new URL(window.location.href); if (e.target.value) url.searchParams.set("familie", e.target.value); else url.searchParams.delete("familie"); window.location.href = url.toString(); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Alle Familien</option>
            {familienRes.data.map((f) => (
              <option key={f.id} value={f.id}>{f.vorname} {f.nachname}</option>
            ))}
          </select>
        </div>
      )}

      <WundversorgungClient
        versorgungen={versorgungRes.data ?? []}
        isAnbieter={true}
        familieProfileId={familieProfileId}
      />
    </div>
  );
}
