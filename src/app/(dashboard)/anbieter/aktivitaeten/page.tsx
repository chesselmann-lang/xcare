import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AktivitaetenClient } from "@/components/aktivitaeten/AktivitaetenClient";

export async function generateMetadata() {
  return { title: "Aktivitäten & Soziale Teilhabe | xcare" };
}

export default async function AktivitaetenPage() {
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

  const { data: rawAngebote } = await (supabase as any)
    .from("aktivitaeten_angebote")
    .select("*")
    .eq("anbieter_id", anbieter.id)
    .order("wochentag", { ascending: true })
    .order("uhrzeit", { ascending: true });

  const angebote: any[] = rawAngebote ?? [];
  const stats = {
    gesamt: angebote.length,
    aktiv: angebote.filter(a => a.aktiv).length,
    kategorien: new Set(angebote.map((a: any) => a.kategorie)).size,
  };

  return <AktivitaetenClient initialAngebote={angebote} stats={stats} />;
}
