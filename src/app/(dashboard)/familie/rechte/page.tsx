import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Scale, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RechteCheckerClient } from "@/components/rechte/RechteCheckerClient";

export const metadata: Metadata = {
  title: "Pflegeperson-Rechte-Checker | xcare Familie",
  description:
    "Ermitteln Sie Ihre gesetzlichen Rechte als pflegende Angehörige – Freistellungsansprüche, Kündigungsschutz, Geldleistungen und mehr.",
};

export default async function PflegepersonRechtePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Rollenprüfung: nur Familie-Nutzer
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/");

  // Alle aktiven Rechte für die Client-Komponente vorladen (SSR)
  const { data: rechteData, error } = await supabase
    .from("pflegeperson_rechte")
    .select(
      "id, gesetz, paragraph, titel, beschreibung, voraussetzungen, dauer, leistung, antrag_bei, kategorie"
    )
    .eq("aktiv", true)
    .order("kategorie")
    .order("gesetz");

  const alleRechte = rechteData ?? [];

  if (error) {
    console.error("[PflegepersonRechtePage] Fehler beim Laden der Rechte:", error);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Seitenkopf */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-[--primary]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[--foreground]">
              Pflegeperson-Rechte-Checker
            </h1>
            <p className="text-sm text-gray-500">
              Ihre gesetzlichen Rechte als pflegende Angehörige
            </p>
          </div>
        </div>
      </div>

      {/* Info-Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-0.5">
            Ihre Rechte kennen – Ihre Situation verbessern
          </p>
          <p className="text-sm text-blue-800">
            Erfahren Sie, welche gesetzlichen Rechte Ihnen als pflegende
            Angehörige zustehen. Der Rechte-Checker prüft Ihre Situation
            anhand von Pflegezeitgesetz (PflegeZG), Familienpflegezeitgesetz
            (FPfZG), SGB XI und Arbeitsschutzgesetz (ArbSchG) – kostenlos,
            anonym und ohne juristische Verpflichtung.
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Hinweis: Dieses Tool ersetzt keine Rechtsberatung. Im Zweifelsfall
            wenden Sie sich an einen Fachanwalt für Arbeitsrecht oder an die
            kostenlose Pflegeberatung Ihrer Pflegekasse.
          </p>
        </div>
      </div>

      {/* Checker-Client */}
      <RechteCheckerClient alleRechte={alleRechte} isLoggedIn={!!user} />
    </div>
  );
}
