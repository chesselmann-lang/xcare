import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { VisitClient } from "@/components/visiten/VisitClient";

export async function generateMetadata() {
  return { title: "Pflegevisite & Fallbesprechung | xcare" };
}

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  const { data: anbieterRaw } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  const anbieter = anbieterRaw as any;
  if (!anbieter) notFound();

  const { data: bewohner } = await (supabase as any)
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .single();
  if (!bewohner) notFound();

  const { data: rawVisiten } = await (supabase as any)
    .from("pflegevisiten")
    .select("*, aufgaben:visite_aufgaben(*)")
    .eq("bewohner_id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .order("datum", { ascending: false });

  const visiten: any[] = rawVisiten ?? [];

  const stats = {
    gesamt: visiten.length,
    geplant: visiten.filter((v: any) => v.status === "geplant").length,
    durchgefuehrt: visiten.filter((v: any) => v.status === "durchgefuehrt").length,
    offeneAufgaben: visiten.reduce((sum: number, v: any) => sum + (v.aufgaben ?? []).filter((a: any) => !a.erledigt).length, 0),
  };

  return (
    <VisitClient
      bewohnerId={bewohnerId}
      bewohnerName={`${bewohner.vorname} ${bewohner.nachname}`}
      initialVisiten={visiten}
      stats={stats}
    />
  );
}
