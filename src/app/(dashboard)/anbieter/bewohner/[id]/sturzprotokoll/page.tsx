import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SturzprotokollClient from "@/components/sturzprotokoll/SturzprotokollClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("bewohner")
    .select("vorname, nachname")
    .eq("id", id)
    .single();
  const d = data as any;
  const name = d ? `${d.vorname} ${d.nachname}` : "Bewohner";
  return { title: `Sturzprotokoll – ${name}` };
}

export default async function SturzprotokollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) redirect("/anbieter/onboarding");

  const { data: bewohner } = await (supabase as any)
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", id)
    .eq("anbieter_id", (anbieter as any).id)
    .single();
  if (!bewohner) notFound();

  const bewohnerName = `${(bewohner as any).vorname} ${(bewohner as any).nachname}`;

  const since12m = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [protokolleRes, risikoRes] = await Promise.all([
    (supabase as any)
      .from("sturzprotokolle")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", (anbieter as any).id)
      .gte("datum", since12m)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false }),
    (supabase as any)
      .from("sturzrisiko_einschaetzung")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", (anbieter as any).id)
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const protokolle = (protokolleRes.data ?? []) as any[];
  const letzteRisikoeinschaetzung = risikoRes.data ?? null;

  const gesamt = protokolle.length;
  const schwereSturzze = protokolle.filter(
    (p: any) => p.schweregrad === "mittel" || p.schweregrad === "schwer"
  ).length;
  const letzterSturz = protokolle.length > 0 ? protokolle[0].datum : null;

  const stats = {
    gesamt,
    schwereSturzze,
    letzterSturz,
    risikostufe: (letzteRisikoeinschaetzung as any)?.risikostufe ?? null,
    risikoGesamtpunkte: (letzteRisikoeinschaetzung as any)?.gesamtpunkte ?? null,
  };

  return (
    <SturzprotokollClient
      bewohnerId={id}
      bewohnerName={bewohnerName}
      initialProtokolle={protokolle}
      initialRisikoeinschaetzung={letzteRisikoeinschaetzung}
      initialStats={stats}
    />
  );
}
