import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotfallClient from "@/components/notfall/NotfallClient";

export default async function FamilieNotfallPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "familie") redirect("/");

  const [{ data: plan }, { data: kontakte }] = await Promise.all([
    supabase
      .from("notfallplaene")
      .select("*")
      .eq("familie_profile_id", profile.id)
      .eq("aktiv", true)
      .single(),
    supabase
      .from("notfallkontakte")
      .select("*")
      .eq("familie_profile_id", profile.id)
      .order("prioritaet"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notfallmanagement</h1>
        <p className="text-sm text-gray-500 mt-1">
          Medizinische Informationen und Notfallkontakte — im Ernstfall sofort verfügbar
        </p>
      </div>
      <NotfallClient
        plan={plan ?? null}
        kontakte={kontakte ?? []}
        isAnbieter={false}
      />
    </div>
  );
}
