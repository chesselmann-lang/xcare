import { createClient } from "@/lib/supabase/server";
import { PflegeatlasClient } from "@/components/karte/PflegeatlasClient";

export default async function KartePage() {
  const supabase = await createClient();

  // Load anbieter with coordinates (use plz as proxy for now)
  const { data: anbieter } = await supabase
    .from("profiles")
    .select("id, vorname, nachname, beschreibung, plz, ort, rolle, avatar_url")
    .eq("rolle", "anbieter")
    .not("plz", "is", null)
    .limit(200);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pflegeatlas Deutschland</h1>
          <p className="text-sm text-gray-500">
            {anbieter?.length || 0} Pflegeanbieter in Ihrer Nähe
          </p>
        </div>
      </div>
      <div className="flex-1">
        <PflegeatlasClient anbieter={anbieter || []} />
      </div>
    </div>
  );
}
