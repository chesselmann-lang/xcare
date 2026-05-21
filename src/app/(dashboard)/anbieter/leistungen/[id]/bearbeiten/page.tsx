import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeistungBearbeitenForm } from "./leistung-bearbeiten-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function LeistungBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role === "familie") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter/leistungen");

  const { data: leistung } = await supabase
    .from("leistungen")
    .select("*")
    .eq("id", id)
    .eq("anbieter_id", anbieter.id)
    .single();

  if (!leistung) notFound();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Leistungen", href: "/anbieter/leistungen" },
          { label: leistung.name, href: undefined },
          { label: "Bearbeiten" },
        ]}
      />
      <LeistungBearbeitenForm leistung={leistung} />
    </div>
  );
}
