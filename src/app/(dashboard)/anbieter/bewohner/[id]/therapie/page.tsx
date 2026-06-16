import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TherapieClient } from "@/components/therapie/TherapieClient";

export async function generateMetadata() {
  return { title: "Therapiemanagement | xcare" };
}

export default async function TherapiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: anbieterRaw } = await supabase
    .from("anbieter")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  const anbieter = anbieterRaw as any;
  if (!anbieter) notFound();

  const { data: bewohnerRaw } = await (supabase as any)
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .single();
  if (!bewohnerRaw) notFound();
  const bewohner = bewohnerRaw as any;

  const { data: rawTherapien } = await (supabase as any)
    .from("therapien")
    .select("*")
    .eq("bewohner_id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .order("erstellt_am", { ascending: false });

  const therapien = (rawTherapien ?? []) as any[];
  const stats = {
    gesamt: therapien.length,
    aktiv: therapien.filter((t: any) => t.status === "aktiv").length,
    pausiert: therapien.filter((t: any) => t.status === "pausiert").length,
    abgeschlossen: therapien.filter((t: any) => t.status === "abgeschlossen").length,
  };

  return (
    <TherapieClient
      bewohnerId={bewohnerId}
      bewohnerName={`${bewohner.vorname} ${bewohner.nachname}`}
      initialTherapien={therapien}
      stats={stats}
    />
  );
}
