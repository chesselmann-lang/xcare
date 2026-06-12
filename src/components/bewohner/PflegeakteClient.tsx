"use client";

import { useState, useMemo } from "react";
import {
  User, MapPin, Phone, Heart, Calendar, Clock, Euro, CheckCircle,
  FileText, ChevronDown, ChevronUp, Activity, AlertCircle, Route
} from "lucide-react";

type Bewohner = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  geschlecht: string | null;
  zimmer_nr: string | null;
  station: string | null;
  aufnahmedatum: string | null;
  status: string;
  pflegegrad: number | null;
  hauptdiagnosen: string[];
  allergien: string[];
  notfallkontakt_name: string | null;
  notfallkontakt_telefon: string | null;
  krankenkasse: string | null;
  versicherungsnummer: string | null;
  mobilitaet: string | null;
  kommunikation: string | null;
  orientierung: string | null;
  medikamenten_hinweis: string | null;
  ernaehrungsbesonderheiten: string | null;
  notizen: string | null;
};

type Einsatz = {
  id: string;
  geplante_ankunft: string;
  geplante_abfahrt: string;
  tatsaechliche_ankunft: string | null;
  tatsaechliche_abfahrt: string | null;
  leistungsart: string | null;
  leistungsminuten: number | null;
  status: string;
  prioritaet: string;
  pflegedokumentation: string | null;
  abwesenheitsgrund: string | null;
  touren: {
    datum: string;
    name: string;
    fahrzeug: string | null;
    fahrer: { vorname: string | null; nachname: string | null } | null;
  } | null;
};

type Leistungsnachweis = {
  id: string;
  leistungsdatum: string;
  abrechnungsmonat: string;
  leistungsart: string;
  leistungsminuten: number | null;
  einheit: string | null;
  einzelpreis_ct: number | null;
  menge: number | null;
  gesamtbetrag_ct: number | null;
  status: string;
  eingereicht_am: string | null;
  genehmigt_am: string | null;
  krankenkasse: string | null;
  abrechnungs_referenz: string | null;
};

type Stats = {
  totalEinsaetze: number;
  abgeschlosseneEinsaetze: number;
  totalMinuten: number;
  totalBetrag: number;
  genehmigterBetrag: number;
};

const EINSATZ_STATUS_COLOR: Record<string, string> = {
  geplant: "bg-gray-100 text-gray-700",
  angekommen: "bg-blue-100 text-blue-700",
  abgeschlossen: "bg-green-100 text-green-700",
  nicht_angetroffen: "bg-orange-100 text-orange-700",
  storniert: "bg-red-100 text-red-700",
};

const LN_STATUS_COLOR: Record<string, string> = {
  offen: "bg-gray-100 text-gray-700",
  eingereicht: "bg-blue-100 text-blue-700",
  genehmigt: "bg-green-100 text-green-700",
  abgelehnt: "bg-red-100 text-red-700",
  storniert: "bg-orange-100 text-orange-700",
};

function formatDate(d: string | null): string {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE");
}

function formatEuro(ct: number | null): string {
  if (ct == null) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(ct / 100);
}

function getAlter(geburtsdatum: string | null): string {
  if (!geburtsdatum) return "unbekannt";
  const diff = Date.now() - new Date(geburtsdatum).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} Jahre`;
}

export function PflegeakteClient({
  bewohner,
  einsaetze,
  leistungsnachweise,
  stats,
}: {
  bewohner: Bewohner;
  einsaetze: Einsatz[];
  leistungsnachweise: Leistungsnachweis[];
  stats: Stats;
}) {
  const [activeTab, setActiveTab] = useState<"stammdaten" | "einsaetze" | "leistungen">("stammdaten");
  const [expandedEinsatz, setExpandedEinsatz] = useState<string | null>(null);
  const [filterEinsatzStatus, setFilterEinsatzStatus] = useState("");
  const [filterLnMonat, setFilterLnMonat] = useState("");

  const filteredEinsaetze = useMemo(() => {
    if (!filterEinsatzStatus) return einsaetze;
    return einsaetze.filter((e) => e.status === filterEinsatzStatus);
  }, [einsaetze, filterEinsatzStatus]);

  const lnMonths = useMemo(() => {
    const m = new Set(leistungsnachweise.map((l) => l.abrechnungsmonat));
    return Array.from(m).sort().reverse();
  }, [leistungsnachweise]);

  const filteredLn = useMemo(() => {
    if (!filterLnMonat) return leistungsnachweise;
    return leistungsnachweise.filter((l) => l.abrechnungsmonat === filterLnMonat);
  }, [leistungsnachweise, filterLnMonat]);

  const tabs = [
    { id: "stammdaten" as const, label: "Stammdaten", icon: User },
    { id: "einsaetze" as const, label: `Einsätze (${einsaetze.length})`, icon: Route },
    { id: "leistungen" as const, label: `Leistungen (${leistungsnachweise.length})`, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Einsätze gesamt", value: stats.totalEinsaetze, color: "text-[--primary]" },
          { label: "Abgeschlossen", value: stats.abgeschlosseneEinsaetze, color: "text-green-600" },
          { label: "Gesamtminuten", value: `${stats.totalMinuten} Min.`, color: "text-blue-600" },
          { label: "Abrechnungssumme", value: formatEuro(stats.totalBetrag), color: "text-orange-600" },
          { label: "Genehmigt", value: formatEuro(stats.genehmigterBetrag), color: "text-green-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[--card] rounded-xl border border-[--border] p-4">
            <p className="text-xs text-[--muted-foreground] mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[--border]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? "border-[--primary] text-[--primary]"
                : "border-transparent text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Stammdaten Tab */}
      {activeTab === "stammdaten" && (
        <div className="space-y-6">
          {/* Personal */}
          <div className="bg-[--card] rounded-xl border border-[--border] p-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><User className="w-4 h-4 text-[--primary]" />Persönliche Daten</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-[--muted-foreground]">Name</p><p className="font-medium">{bewohner.vorname} {bewohner.nachname}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Alter</p><p>{getAlter(bewohner.geburtsdatum)}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Geburtsdatum</p><p>{formatDate(bewohner.geburtsdatum)}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Geschlecht</p><p className="capitalize">{bewohner.geschlecht ?? "–"}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Zimmer</p><p>{bewohner.zimmer_nr ?? "–"}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Station</p><p>{bewohner.station ?? "–"}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Aufnahme</p><p>{formatDate(bewohner.aufnahmedatum)}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Status</p><p className="capitalize">{bewohner.status}</p></div>
            </div>
          </div>

          {/* Pflegegrad + Funktionsstatus */}
          <div className="bg-[--card] rounded-xl border border-[--border] p-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500" />Pflege & Funktionsstatus</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-[--muted-foreground]">Pflegegrad</p>
                <p className="font-bold text-lg text-[--primary]">{bewohner.pflegegrad ? `PG ${bewohner.pflegegrad}` : "–"}</p>
              </div>
              <div><p className="text-xs text-[--muted-foreground]">Mobilität</p><p className="capitalize">{bewohner.mobilitaet?.replace(/_/g, " ") ?? "–"}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Kommunikation</p><p className="capitalize">{bewohner.kommunikation ?? "–"}</p></div>
              <div><p className="text-xs text-[--muted-foreground]">Orientierung</p><p className="capitalize">{bewohner.orientierung ?? "–"}</p></div>
            </div>
            {bewohner.hauptdiagnosen?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-[--muted-foreground] mb-2">Hauptdiagnosen</p>
                <div className="flex flex-wrap gap-2">
                  {bewohner.hauptdiagnosen.map((d, i) => (
                    <span key={i} className="bg-[--muted] rounded-full px-3 py-1 text-xs">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {bewohner.allergien?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-[--muted-foreground] mb-2">Allergien</p>
                <div className="flex flex-wrap gap-2">
                  {bewohner.allergien.map((a, i) => (
                    <span key={i} className="bg-red-50 text-red-700 rounded-full px-3 py-1 text-xs">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hinweise */}
          {(bewohner.medikamenten_hinweis || bewohner.ernaehrungsbesonderheiten) && (
            <div className="bg-[--card] rounded-xl border border-[--border] p-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-500" />Wichtige Hinweise</h3>
              <div className="space-y-3 text-sm">
                {bewohner.medikamenten_hinweis && (
                  <div>
                    <p className="text-xs text-[--muted-foreground] mb-1">Medikamente</p>
                    <p className="bg-orange-50 rounded-lg p-3 text-orange-800">{bewohner.medikamenten_hinweis}</p>
                  </div>
                )}
                {bewohner.ernaehrungsbesonderheiten && (
                  <div>
                    <p className="text-xs text-[--muted-foreground] mb-1">Ernährung</p>
                    <p className="bg-blue-50 rounded-lg p-3 text-blue-800">{bewohner.ernaehrungsbesonderheiten}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notfall + Versicherung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[--card] rounded-xl border border-[--border] p-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Phone className="w-4 h-4 text-red-500" />Notfallkontakt</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-xs text-[--muted-foreground]">Name</p><p>{bewohner.notfallkontakt_name ?? "–"}</p></div>
                <div><p className="text-xs text-[--muted-foreground]">Telefon</p><p>{bewohner.notfallkontakt_telefon ?? "–"}</p></div>
              </div>
            </div>
            <div className="bg-[--card] rounded-xl border border-[--border] p-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" />Versicherung</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-xs text-[--muted-foreground]">Krankenkasse</p><p>{bewohner.krankenkasse ?? "–"}</p></div>
                <div><p className="text-xs text-[--muted-foreground]">Vers.-Nr.</p><p>{bewohner.versicherungsnummer ?? "–"}</p></div>
              </div>
            </div>
          </div>

          {bewohner.notizen && (
            <div className="bg-[--card] rounded-xl border border-[--border] p-6">
              <h3 className="font-semibold text-sm mb-3">Notizen</h3>
              <p className="text-sm text-[--muted-foreground] whitespace-pre-line">{bewohner.notizen}</p>
            </div>
          )}
        </div>
      )}

      {/* Einsätze Tab */}
      {activeTab === "einsaetze" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select
              value={filterEinsatzStatus}
              onChange={(e) => setFilterEinsatzStatus(e.target.value)}
              className="rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm"
            >
              <option value="">Alle Status</option>
              {Object.keys(EINSATZ_STATUS_COLOR).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <span className="text-sm text-[--muted-foreground]">{filteredEinsaetze.length} Einsätze</span>
          </div>

          {filteredEinsaetze.length === 0 ? (
            <div className="text-center py-12 text-[--muted-foreground]">
              <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Keine Einsätze gefunden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEinsaetze.map((e) => {
                const expanded = expandedEinsatz === e.id;
                const tour = e.touren;
                return (
                  <div key={e.id} className="bg-[--card] rounded-xl border border-[--border] overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[--muted]/30"
                      onClick={() => setExpandedEinsatz(expanded ? null : e.id)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[--primary]/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-[--primary]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{tour?.datum ? formatDate(tour.datum) : "–"}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${EINSATZ_STATUS_COLOR[e.status] ?? "bg-gray-100 text-gray-700"}`}>
                            {e.status.replace(/_/g, " ")}
                          </span>
                          {e.prioritaet !== "normal" && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.prioritaet === "dringend" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                              {e.prioritaet}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[--muted-foreground] mt-0.5">
                          {e.leistungsart ?? tour?.name ?? "Tour"} · {e.geplante_ankunft}–{e.geplante_abfahrt}
                          {e.leistungsminuten ? ` · ${e.leistungsminuten} Min.` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0 text-xs text-[--muted-foreground]">
                        {tour?.fahrer ? `${tour.fahrer.vorname ?? ""} ${tour.fahrer.nachname ?? ""}`.trim() : ""}
                        {expanded ? <ChevronUp className="w-4 h-4 ml-1 inline" /> : <ChevronDown className="w-4 h-4 ml-1 inline" />}
                      </div>
                    </div>
                    {expanded && (
                      <div className="border-t border-[--border] p-4 space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-xs text-[--muted-foreground]">Tour</p><p>{tour?.name ?? "–"}</p></div>
                          <div><p className="text-xs text-[--muted-foreground]">Fahrzeug</p><p>{tour?.fahrzeug ?? "–"}</p></div>
                          <div><p className="text-xs text-[--muted-foreground]">Tatsächl. Ankunft</p><p>{e.tatsaechliche_ankunft ?? "–"}</p></div>
                          <div><p className="text-xs text-[--muted-foreground]">Tatsächl. Abfahrt</p><p>{e.tatsaechliche_abfahrt ?? "–"}</p></div>
                        </div>
                        {e.pflegedokumentation && (
                          <div>
                            <p className="text-xs text-[--muted-foreground] mb-1">Pflegedokumentation</p>
                            <p className="text-sm bg-[--muted]/50 rounded-lg p-3 whitespace-pre-line">{e.pflegedokumentation}</p>
                          </div>
                        )}
                        {e.abwesenheitsgrund && (
                          <p className="text-sm text-orange-700 bg-orange-50 rounded-lg p-3">Abwesend: {e.abwesenheitsgrund}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Leistungsnachweise Tab */}
      {activeTab === "leistungen" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select
              value={filterLnMonat}
              onChange={(e) => setFilterLnMonat(e.target.value)}
              className="rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm"
            >
              <option value="">Alle Monate</option>
              {lnMonths.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-sm text-[--muted-foreground]">{filteredLn.length} Einträge</span>
          </div>

          {filteredLn.length === 0 ? (
            <div className="text-center py-12 text-[--muted-foreground]">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Keine Leistungsnachweise vorhanden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLn.map((l) => (
                <div key={l.id} className="bg-[--card] rounded-xl border border-[--border] p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <Euro className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{l.leistungsart}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LN_STATUS_COLOR[l.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {l.status}
                      </span>
                    </div>
                    <p className="text-xs text-[--muted-foreground] mt-0.5">
                      {formatDate(l.leistungsdatum)} · {l.abrechnungsmonat}
                      {l.leistungsminuten ? ` · ${l.leistungsminuten} Min.` : ""}
                      {l.krankenkasse ? ` · ${l.krankenkasse}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatEuro(l.gesamtbetrag_ct)}</p>
                    {l.abrechnungs_referenz && (
                      <p className="text-xs text-[--muted-foreground]">{l.abrechnungs_referenz}</p>
                    )}
                    <div className="text-xs text-[--muted-foreground] flex gap-1 justify-end">
                      {l.eingereicht_am && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDate(l.eingereicht_am)}</span>}
                      {l.genehmigt_am && <span className="flex items-center gap-0.5 text-green-600"><CheckCircle className="w-3 h-3" />{formatDate(l.genehmigt_am)}</span>}
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-right text-[--muted-foreground]">
                Gesamt: {formatEuro(filteredLn.reduce((s, l) => s + (l.gesamtbetrag_ct ?? 0), 0))}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
