import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BewertungClient } from "@/components/bewertungen/BewertungClient";

export const metadata = { title: "Bewertung abgeben — xcare" };

interface Props {
  params: Promise<{ buchungId: string }>;
}

export default async function BewertungPage({ params }: Props) {
  const { buchungId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load buchung and verify it belongs to this user and is abgeschlossen
  const { data: buchung } = await supabase
    .from("buchungen")
    .select("id, status, familie_id, anbieter_id, datum, leistungsart")
    .eq("id", buchungId)
    .single();

  if (!buchung) notFound();

  if (buchung.familie_id !== user.id) redirect("/familie/pflegeboerse/buchungen");

  if (buchung.status !== "abgeschlossen") {
    redirect("/familie/pflegeboerse/buchungen");
  }

  // Check if already rated
  const { data: existing } = await supabase
    .from("bewertungen")
    .select("id")
    .eq("buchung_id", buchungId)
    .maybeSingle();

  if (existing) {
    redirect("/familie/pflegeboerse/buchungen?bewertung=bereits_abgegeben");
  }

  // Load anbieter name for display
  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("name")
    .eq("user_id", buchung.anbieter_id)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[--foreground]">Bewertung abgeben</h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Wie war Ihre Erfahrung mit{" "}
          <span className="font-medium text-[--foreground]">
            {anbieter?.name ?? "dem Pflegeanbieter"}
          </span>
          ?
        </p>
        <p className="text-xs text-[--muted-foreground] mt-0.5">
          Buchung vom{" "}
          {new Date(buchung.datum).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <BewertungClient
        buchungId={buchungId}
        anbieterId={buchung.anbieter_id}
        anbieterName={anbieter?.name ?? "Anbieter"}
      />
    </div>
  );
}
