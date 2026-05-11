import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ZertifikateClient from "@/components/zertifikate/ZertifikateClient";

export default async function AnbieterZertifikatePage() {
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

  const [{ data: careWorkers }, { data: zertifikate }] = await Promise.all([
    supabase
      .from("care_workers")
      .select("id, vorname, nachname")
      .eq("anbieter_id", anbieter?.id ?? "")
      .eq("aktiv", true)
      .order("nachname"),
    supabase
      .from("care_worker_zertifikate")
      .select(`
        id, zertifikat_name, ausstellende_stelle, ausstellungsdatum,
        ablaufdatum, zertifikat_nummer, notizen, created_at,
        care_workers!inner (id, vorname, nachname, anbieter_id)
      `)
      .order("ablaufdatum", { ascending: true }),
  ]);

  // Filter zertifikate to only those belonging to this anbieter's care_workers
  const careWorkerIds = new Set((careWorkers ?? []).map((w) => w.id));
  const filteredZertifikate = (zertifikate ?? []).filter((z) => {
    const cw = z.care_workers as unknown as { id: string; anbieter_id: string } | null;
    return cw && careWorkerIds.has(cw.id);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kompetenz-Portfolio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Zertifikate und Qualifikationen Ihrer Pflegekräfte — mit Ablauf-Tracking
        </p>
      </div>
      <ZertifikateClient
        zertifikate={filteredZertifikate}
        careWorkers={careWorkers ?? []}
      />
    </div>
  );
}
