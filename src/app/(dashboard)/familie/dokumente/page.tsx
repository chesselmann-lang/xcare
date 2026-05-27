import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DokumentenTresor } from "@/components/dokumente/DokumentenTresor";
import DokumenteKIClient from "@/components/dokumente/DokumenteKIClient";
import type { Dokument } from "@/lib/dokumente/types";

export const metadata = {
  title: "Dokumenten-Tresor & MDK-Analyse | xcare Familie",
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

  // Load existing MDK analyses
  const { data: analysen } = await supabase
    .from("dokument_analysen")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Standard document vault */}
      <section>
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Dokumenten-Tresor</h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Laden Sie wichtige Dokumente hoch und verwalten Sie diese sicher an einem Ort.
          </p>
        </div>
        <div className="mt-6">
          <DokumentenTresor initialDokumente={(dokumente as Dokument[]) ?? []} />
        </div>
      </section>

      {/* MDK AI analysis section */}
      <section>
        <div>
          <h2 className="text-xl font-bold text-[--foreground]">MDK-Dokumente analysieren</h2>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Laden Sie MDK-Bescheide, Pflegegutachten oder Ablehnungen hoch — unsere KI analysiert
            das Dokument und schlägt Ihnen Widerspruchsargumente vor.
          </p>
        </div>
        <div className="mt-6">
          <DokumenteKIClient initialAnalysen={analysen ?? []} />
        </div>
      </section>
    </div>
  );
}
