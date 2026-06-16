import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { BiografieClient } from "@/components/biografie/BiografieClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: "Lebensbiografie | xcare" };
}

export default async function BiografiePage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: bewohner } = await (supabase as any)
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .single();
  if (!bewohner) notFound();

  const { data: biografie } = await (supabase as any)
    .from("bewohner_biografien")
    .select("*")
    .eq("bewohner_id", bewohnerId)
    .maybeSingle();

  const name = `${bewohner.vorname} ${bewohner.nachname}`;

  return (
    <BiografieClient
      bewohnerId={bewohnerId}
      bewohnerName={name}
      initialBiografie={biografie}
    />
  );
}
