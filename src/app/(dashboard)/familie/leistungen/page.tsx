// ============================================
// /familie/leistungen — Persönliche Leistungsübersicht
// Deterministische Anspruchs-Engine + Verlauf gespeicherter Berechnungen.
// COMPLIANCE: Kein LLM-Urteil über Ansprüche (FB-31, FB-125).
// ============================================

import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Euro, Calculator, Clock, Info, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnspruchsRechnerMitSpeichern } from "@/components/anspruch/AnspruchsRechnerMitSpeichern";
import { DeleteAnspruchsProfileButton } from "@/components/anspruch/DeleteAnspruchsProfileButton";
import type { AnspruchsLebenslage } from "@/lib/anspruch/types";

export const metadata: Metadata = {
  title: "Meine Leistungen & Ansprüche | xcare",
  description:
    "Berechnen Sie Ihre staatlichen Ansprüche (Pflegegeld, Elterngeld, Wohngeld, Bürgergeld) deterministisch nach geltendem Recht.",
};

const LEBENSLAGE_LABELS: Record<AnspruchsLebenslage, string> = {
  alter_pflege: "Alter & Pflege",
  eingliederung_behinderung: "Behinderung",
  erwerbsleben_vereinbarkeit: "Beruf & Familie",
  krankheit_genesung: "Krankheit",
  geburt_fruehe_kindheit: "Geburt & Kleinkind",
  schulkind_jugend: "Schulkind & Jugend",
  hospiz_palliativ: "Hospiz & Palliativ",
  trauer_nachlass: "Trauer & Nachlass",
};

const LEBENSLAGE_ICONS: Record<AnspruchsLebenslage, string> = {
  alter_pflege: "🏠",
  eingliederung_behinderung: "♿",
  erwerbsleben_vereinbarkeit: "💼",
  krankheit_genesung: "🏥",
  geburt_fruehe_kindheit: "👶",
  schulkind_jugend: "🎒",
  hospiz_palliativ: "🌿",
  trauer_nachlass: "🕊️",
};

type SavedProfile = {
  id: string;
  lebenslage: string;
  bezeichnung: string | null;
  gesamt_monatlich_eur: number | null;
  gesamt_jaehrlich_eur: number | null;
  created_at: string;
};

export default async function LeistungenPage({
  searchParams,
}: {
  searchParams: Promise<{ lebenslage?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Gespeicherte Profile laden
  const { data: gespeicherte } = await supabase
    .from("anspruchs_profile")
    .select(
      "id, lebenslage, bezeichnung, gesamt_monatlich_eur, gesamt_jaehrlich_eur, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const params = await searchParams;
  const validLebenslagen = Object.keys(LEBENSLAGE_LABELS) as AnspruchsLebenslage[];
  const raw = params.lebenslage ?? "alter_pflege";
  const aktiveLebenslage: AnspruchsLebenslage = validLebenslagen.includes(
    raw as AnspruchsLebenslage
  )
    ? (raw as AnspruchsLebenslage)
    : "alter_pflege";

  const savedProfiles = (gespeicherte ?? []) as SavedProfile[];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          Meine Leistungsansprüche
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          Berechnen Sie Ihre staatlichen Leistungen deterministisch nach geltendem Recht (Stand 2025).
          Kein KI-Urteil — regelbasiert nach SGB XI/XII, BEEG, WoGG, SGB V/VI, EStG.
        </p>
      </div>

      {/* Compliance-Badge */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <strong>Deterministische Berechnung — kein LLM-Urteil (FB-31, FB-125)</strong>
          <p className="text-xs text-blue-600 mt-0.5">
            Diese Engine trifft keine KI-basierten Entscheidungen über Sozialleistungen.
            Alle Berechnungen erfolgen regelbasiert nach deutschem Recht und sind vollständig auditierbar.
          </p>
        </div>
      </div>

      {/* Lebenslage-Auswahl */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Lebenslage wählen
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {validLebenslagen.map((ll) => (
            <Link
              key={ll}
              href={`/familie/leistungen?lebenslage=${ll}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                aktiveLebenslage === ll
                  ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{LEBENSLAGE_ICONS[ll]}</span>
              <span className="leading-tight text-xs">{LEBENSLAGE_LABELS[ll]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Rechner */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {LEBENSLAGE_ICONS[aktiveLebenslage]} {LEBENSLAGE_LABELS[aktiveLebenslage]}
        </h2>
        <AnspruchsRechnerMitSpeichern lebenslage={aktiveLebenslage} />
      </div>

      {/* Gespeicherte Berechnungen */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          Gespeicherte Berechnungen
          <span className="text-sm font-normal text-gray-400">({savedProfiles.length}/50)</span>
        </h2>

        {savedProfiles.length === 0 ? (
          <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
            <Calculator className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Noch keine Berechnungen gespeichert. Führen Sie oben eine Berechnung durch und
            speichern Sie das Ergebnis für späteren Zugriff.
          </div>
        ) : (
          <div className="space-y-2">
            {savedProfiles.map((p) => {
              const label =
                LEBENSLAGE_LABELS[p.lebenslage as AnspruchsLebenslage] ?? p.lebenslage;
              const icon =
                LEBENSLAGE_ICONS[p.lebenslage as AnspruchsLebenslage] ?? "📋";
              const datum = new Date(p.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {p.bezeichnung ?? label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {datum} · {label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {p.gesamt_monatlich_eur !== null && p.gesamt_monatlich_eur > 0 && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-green-700 font-semibold text-sm">
                            <Euro className="w-3.5 h-3.5" />
                            {p.gesamt_monatlich_eur.toLocaleString("de-DE")} €
                          </div>
                          <p className="text-xs text-gray-400">pro Monat</p>
                        </div>
                      )}
                      <DeleteAnspruchsProfileButton id={p.id} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Info-Box Beratung */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Individuelle Beratung empfohlen</strong>
            <p className="text-xs text-amber-700 mt-1">
              Diese Berechnung ist eine Orientierungshilfe. Für verbindliche Auskunft wenden Sie
              sich an Ihren{" "}
              <a
                href="https://www.pflegestuetzpunkte.de"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pflegestützpunkt
              </a>
              {" · "}
              <a
                href="https://www.vdk.de"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                VdK 0800 1891 0
              </a>
              {" · "}
              <a
                href="https://www.caritas.de"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Caritas
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
