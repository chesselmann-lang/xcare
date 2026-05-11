import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PinnwandClient from "@/components/pinnwand/PinnwandClient";

export default async function FamiliePinnwandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "familie") redirect("/");

  const { data: eintraege } = await supabase
    .from("familie_pinnwand")
    .select(`id, typ, inhalt, erledigt, erledigt_am, pinned, erstellt_von_rolle, created_at,
      profiles!familie_pinnwand_erstellt_von_fkey (vorname, nachname)`)
    .eq("familie_profile_id", profile.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pinnwand</h1>
        <p className="text-sm text-gray-500 mt-1">
          Notizen, Aufgaben & Informationen von Ihnen und Ihrem Pflegeanbieter
        </p>
      </div>
      <PinnwandClient
        eintraege={eintraege ?? []}
        isAnbieter={false}
      />
    </div>
  );
}
