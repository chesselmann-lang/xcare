import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AngehoerigClient } from "@/components/angehoerigen-portal/AngehoerigClient";

export const metadata: Metadata = {
  title: "Angehörigen-Portal | xcare",
  description: "Familie über den Pflegezustand informieren — Tages-Updates und Zugriffsrechte.",
};

type Params = { params: Promise<{ id: string }> };

export default async function AngehoerigPage({ params }: Params) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/anbieter/profil");

  const { data: bewohner } = await supabase
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .single();
  if (!bewohner) notFound();

  const [{ data: angehoerige }, { data: updates }] = await Promise.all([
    supabase
      .from("bewohner_angehoerige")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieter.id)
      .eq("aktiv", true)
      .order("erstellt_am"),
    supabase
      .from("bewohner_tagesupdates")
      .select("*, profiles:erstellt_von(vorname, nachname)")
      .eq("bewohner_id", bewohnerId)
      .order("datum", { ascending: false })
      .limit(20),
  ]);

  return (
    <AngehoerigClient
      bewohner={bewohner as { id: string; vorname: string; nachname: string }}
      initialAngehoerige={(angehoerige ?? []) as Parameters<typeof AngehoerigClient>[0]["initialAngehoerige"]}
      initialUpdates={(updates ?? []) as Parameters<typeof AngehoerigClient>[0]["initialUpdates"]}
    />
  );
}
