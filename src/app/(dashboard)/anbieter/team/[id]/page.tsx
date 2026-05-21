import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MitgliedProfilClient } from "./MitgliedProfilClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teammitglied – xcare",
};

export default async function MitgliedProfilPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter/profil");

  // Fetch the team member — must belong to this anbieter
  const { data: mitglied } = await supabase
    .from("anbieter_mitglieder")
    .select(
      "id, anbieter_id, profile_id, rolle, created_at, profiles(vorname, nachname, email, avatar_url)"
    )
    .eq("id", id)
    .eq("anbieter_id", anbieter.id)
    .single();

  if (!mitglied) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href="/anbieter/team"
        className="inline-flex items-center gap-1.5 text-sm text-[--muted-foreground] hover:text-[--foreground] mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Team
      </Link>

      <MitgliedProfilClient
        mitglied={mitglied as Parameters<typeof MitgliedProfilClient>[0]["mitglied"]}
        anbieterName={anbieter.name}
      />
    </div>
  );
}
