import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DokumentenTresor } from "@/components/dokumente/DokumentenTresor";
import type { Dokument } from "@/lib/dokumente/types";

export const metadata = {
  title: "Dokumenten-Tresor | xcare Familie",
};

export default async function DokumentePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, haushalt_id")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  const { data: dokumente } = await supabase
    .from("dokumente")
    .select("*")
    .eq("profil_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Dokumenten-Tresor</h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Laden Sie wichtige Dokumente hoch und verwalten Sie diese sicher an einem Ort.
        </p>
      </div>

      <DokumentenTresor initialDokumente={(dokumente as Dokument[]) ?? []} />
    </div>
  );
}
