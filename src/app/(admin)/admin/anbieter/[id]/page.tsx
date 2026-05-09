import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, MapPin, Phone, Globe, Mail, Package,
  FileText, Star, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { VerifizierungsButtons } from "../verifizierungs-buttons";
import { formatDate } from "@/lib/utils";
import { LEISTUNGSKATEGORIEN } from "@/lib/constants";
import type { LeistungsKategorie } from "@/lib/types";

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  offen:          { label: "Offen",          class: "bg-yellow-50 text-yellow-700" },
  in_bearbeitung: { label: "In Bearbeitung", class: "bg-blue-50 text-blue-700" },
  angeboten:      { label: "Angebot",        class: "bg-purple-50 text-purple-700" },
  bestaetigt:     { label: "Bestätigt",      class: "bg-green-50 text-green-700" },
  abgelehnt:      { label: "Abgelehnt",      class: "bg-red-50 text-red-600" },
  abgeschlossen:  { label: "Abgeschlossen",  class: "bg-gray-100 text-gray-600" },
};

export default async function AdminAnbieterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("*, profiles(email, vorname, nachname, telefon), leistungen(*)")
    .eq("id", id)
    .single();

  if (!anbieter) notFound();

  const profile = anbieter.profiles as {
    email: string;
    vorname: string | null;
    nachname: string | null;
    telefon: string | null;
  } | null;

  const leistungen = anbieter.leistungen as {
    id: string;
    name: string;
    kategorie: string;
    preis_von: number | null;
    aktiv: boolean;
  }[];

  const { count: anfragenCount } = await supabase
    .from("anfragen")
    .select("*", { count: "exact", head: true })
    .eq("anbieter_id", id);

  // Last 5 anfragen
  const { data: recentAnfragen } = await supabase
    .from("anfragen")
    .select("id, status, created_at, lebenslage")
    .eq("anbieter_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Bewertungen
  const { data: bewertungen } = await supabase
    .from("bewertungen")
    .select("sterne")
    .eq("anbieter_id", id);

  const bewCount = bewertungen?.length ?? 0;
  const bewAvg = bewCount > 0
    ? bewertungen!.reduce((s, b) => s + b.sterne, 0) / bewCount
    : 0;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/anbieter" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Zurück zur Liste
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{anbieter.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${anbieter.verifiziert ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
              {anbieter.verifiziert ? "✓ Verifiziert" : "Ausstehend"}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${anbieter.aktiv ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {anbieter.aktiv ? "Aktiv" : "Inaktiv"}
            </span>
            {(anbieter as { abwesend?: boolean }).abwesend && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                Abwesend
              </span>
            )}
          </div>
        </div>
        <VerifizierungsButtons
          anbieterId={id}
          anbieterName={anbieter.name}
          isVerifiziert={anbieter.verifiziert}
          isAktiv={anbieter.aktiv}
        />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{anfragenCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Anfragen gesamt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{leistungen.filter(l => l.aktiv).length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aktive Leistungen</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-bold text-gray-900">
              {bewCount > 0 ? bewAvg.toFixed(1) : "—"}
            </p>
            {bewCount > 0 && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {bewCount > 0 ? `${bewCount} Bewertung${bewCount > 1 ? "en" : ""}` : "Keine Bewertungen"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stammdaten */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Stammdaten
          </h2>
          <dl className="space-y-2.5">
            {anbieter.beschreibung && (
              <div>
                <dt className="text-xs text-gray-400 font-medium">Beschreibung</dt>
                <dd className="text-sm text-gray-700 mt-0.5">{anbieter.beschreibung}</dd>
              </div>
            )}
            {(anbieter.plz || anbieter.ort) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span>{anbieter.plz} {anbieter.ort}{anbieter.strasse ? `, ${anbieter.strasse}` : ""}</span>
              </div>
            )}
            {anbieter.telefon && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <a href={`tel:${anbieter.telefon}`} className="hover:underline">{anbieter.telefon}</a>
              </div>
            )}
            {anbieter.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                <a href={anbieter.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">{anbieter.website}</a>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <a href={`mailto:${profile.email}`} className="hover:underline">{profile.email}</a>
              </div>
            )}
            <div className="text-xs text-gray-400 pt-1 border-t border-gray-50 mt-2">
              Registriert: {formatDate(anbieter.created_at)}
              {profile?.vorname && (
                <span className="ml-3">Inhaber: {profile.vorname} {profile.nachname ?? ""}</span>
              )}
            </div>
          </dl>
        </div>

        {/* Leistungen */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" /> Leistungen ({leistungen.length})
          </h2>
          {leistungen.length === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Leistungen eingetragen</p>
          ) : (
            <div className="space-y-2">
              {leistungen.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{l.name}</p>
                    <p className="text-xs text-gray-400">
                      {LEISTUNGSKATEGORIEN[l.kategorie as LeistungsKategorie] ?? l.kategorie.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.preis_von && <span className="text-sm text-gray-600">ab {l.preis_von}€</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.aktiv ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {l.aktiv ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Letzte Anfragen */}
        {recentAnfragen && recentAnfragen.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Letzte Anfragen
            </h2>
            <div className="space-y-2">
              {recentAnfragen.map((a) => {
                const sc = STATUS_CONFIG[a.status] ?? { label: a.status, class: "bg-gray-100 text-gray-600" };
                return (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.class}`}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {a.lebenslage?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(a.created_at).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                );
              })}
            </div>
            {(anfragenCount ?? 0) > 5 && (
              <p className="text-xs text-gray-400 mt-3 text-right">
                + {(anfragenCount ?? 0) - 5} weitere Anfragen
              </p>
            )}
          </div>
        )}

        {/* Public Profile Link */}
        <div className="flex justify-end">
          <Link
            href={`/anbieter/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <Globe className="h-3 w-3" /> Öffentliches Profil anzeigen
          </Link>
        </div>
      </div>
    </div>
  );
}
