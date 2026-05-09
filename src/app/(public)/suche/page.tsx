"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Loader2, MapPin, X, SlidersHorizontal,
  ArrowUpDown, CheckCircle2, Map, List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnbieterKarte } from "@/components/suche/AnbieterKarte";
import { KartenAnsicht } from "@/components/suche/KartenAnsicht";
import { createClient } from "@/lib/supabase/client";
import { KOSTENTRAEGER, UMKREIS_OPTIONEN } from "@/lib/constants";
import type { AnbieterMitLeistungen, LeistungsKategorie, Kostentraeger } from "@/lib/types";

type SortOption = "relevanz" | "name_asc" | "bewertung" | "verifiziert";
type ViewMode = "liste" | "karte";

interface ErgebnisAnbieter extends AnbieterMitLeistungen {
  _avgSterne?: number;
  _bewertungenCount?: number;
}

const SORT_OPTIONS: Record<SortOption, string> = {
  relevanz:    "Relevanz",
  name_asc:   "Name A–Z",
  bewertung:  "Beste Bewertung",
  verifiziert: "Verifiziert zuerst",
};

const KATEGORIE_TABS: Array<{ key: LeistungsKategorie | ""; label: string; emoji: string }> = [
  { key: "",                   label: "Alle",            emoji: "🔍" },
  { key: "pflege_ambulant",    label: "Amb. Pflege",     emoji: "🏠" },
  { key: "tagespflege",        label: "Tagespflege",     emoji: "☀️" },
  { key: "beratung",           label: "Beratung",        emoji: "💬" },
  { key: "therapie",           label: "Therapie",        emoji: "🩺" },
  { key: "kinderbetreuung",    label: "Kinderbetreuung", emoji: "👶" },
  { key: "eingliederungshilfe",label: "Eingliederung",   emoji: "♿" },
  { key: "jugendhilfe",        label: "Jugendhilfe",     emoji: "🎒" },
  { key: "hospizdienst",       label: "Hospiz",          emoji: "🕊️" },
];

export default function SuchePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plz, setPlz] = useState(searchParams.get("plz") ?? "");
  const [umkreis, setUmkreis] = useState(20);
  const [kategorie, setKategorie] = useState<LeistungsKategorie | "">(
    (searchParams.get("kategorie") as LeistungsKategorie | null) ?? ""
  );
  const [kostentraeger, setKostentraeger] = useState<Kostentraeger | "">("");
  const [nurVerifiziert, setNurVerifiziert] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("relevanz");
  const [ergebnisse, setErgebnisse] = useState<ErgebnisAnbieter[]>([]);
  const [loading, setLoading] = useState(false);
  const [gesucht, setGesucht] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("liste");
  const supabase = createClient();

  const activeFiltersCount = [
    kostentraeger !== "",
    nurVerifiziert,
    sortBy !== "relevanz",
  ].filter(Boolean).length;

  // Push URL params so searches are shareable / SEO-linkable
  const pushUrl = useCallback((newPlz: string, newKat: string) => {
    const params = new URLSearchParams();
    if (newPlz) params.set("plz", newPlz);
    if (newKat) params.set("kategorie", newKat);
    router.replace(`/suche${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [router]);

  const suchen = useCallback(async (overrideKategorie?: LeistungsKategorie | "") => {
    if (!plz || !/^\d{5}$/.test(plz)) return;
    setLoading(true);
    setGesucht(true);

    const kat = overrideKategorie !== undefined ? overrideKategorie : kategorie;
    pushUrl(plz, kat);

    let query = supabase
      .from("anbieter")
      .select("*, leistungen(*)")
      .eq("aktiv", true)
      .ilike("plz", plz.substring(0, 2) + "%");

    if (nurVerifiziert) query = query.eq("verifiziert", true);

    const { data, error } = await query.limit(50);

    if (!error && data) {
      let gefiltert = (data as ErgebnisAnbieter[]).filter((a) => {
        if (!kat) return true;
        return a.leistungen?.some((l) => l.kategorie === kat);
      });

      if (kostentraeger) {
        gefiltert = gefiltert.filter((a) =>
          a.leistungen?.some((l) => (l.kostentraeger as string[])?.includes(kostentraeger))
        );
      }

      if (gefiltert.length > 0) {
        const ids = gefiltert.map((a) => a.id);
        const { data: bew } = await supabase
          .from("bewertungen").select("anbieter_id, sterne").in("anbieter_id", ids);

        const bewMap: Record<string, { sum: number; count: number }> = {};
        (bew ?? []).forEach((b: { anbieter_id: string; sterne: number }) => {
          if (!bewMap[b.anbieter_id]) bewMap[b.anbieter_id] = { sum: 0, count: 0 };
          bewMap[b.anbieter_id].sum += b.sterne;
          bewMap[b.anbieter_id].count += 1;
        });

        gefiltert = gefiltert.map((a) => ({
          ...a,
          _avgSterne: bewMap[a.id] ? bewMap[a.id].sum / bewMap[a.id].count : 0,
          _bewertungenCount: bewMap[a.id]?.count ?? 0,
        }));
      }

      gefiltert = [...gefiltert].sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name, "de");
        if (sortBy === "bewertung") return (b._avgSterne ?? 0) - (a._avgSterne ?? 0);
        if (sortBy === "verifiziert") {
          if (a.verifiziert && !b.verifiziert) return -1;
          if (!a.verifiziert && b.verifiziert) return 1;
          return 0;
        }
        const scoreA = (a.verifiziert ? 100 : 0) + (a._avgSterne ?? 0) * 10;
        const scoreB = (b.verifiziert ? 100 : 0) + (b._avgSterne ?? 0) * 10;
        return scoreB - scoreA;
      });

      setErgebnisse(gefiltert.slice(0, 20));
    }
    setLoading(false);
  }, [plz, kategorie, kostentraeger, nurVerifiziert, sortBy, supabase, pushUrl]);

  // Auto-search when valid URL params are present on first load
  useEffect(() => {
    const urlPlz = searchParams.get("plz");
    if (urlPlz && /^\d{5}$/.test(urlPlz)) {
      suchen();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKategorieTab = (kat: LeistungsKategorie | "") => {
    setKategorie(kat);
    if (gesucht) suchen(kat);
  };

  const resetFilter = () => {
    setKostentraeger("");
    setNurVerifiziert(false);
    setSortBy("relevanz");
  };

  const kostentraegerListe = Object.entries(KOSTENTRAEGER) as [Kostentraeger, string][];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Anbieter suchen</h1>
        <p className="text-[--muted-foreground]">
          Finden Sie geprüfte Pflegedienste, Beratungsstellen und Sozialdienstleister in Ihrer Nähe.
        </p>
      </div>

      {/* Suchmaske */}
      <div className="rounded-2xl border border-[--border] bg-[--card] p-5 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {/* PLZ */}
          <div className="flex-1 min-w-36">
            <label className="text-xs font-medium text-[--muted-foreground] mb-1.5 block">
              Postleitzahl
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" aria-hidden="true" />
              <Input
                value={plz}
                onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && suchen()}
                placeholder="z.B. 80331"
                className="pl-9"
                maxLength={5}
                inputMode="numeric"
                aria-label="Postleitzahl eingeben"
              />
            </div>
          </div>

          {/* Umkreis */}
          <div className="w-36">
            <label className="text-xs font-medium text-[--muted-foreground] mb-1.5 block">
              Umkreis
            </label>
            <select
              value={umkreis}
              onChange={(e) => setUmkreis(Number(e.target.value))}
              className="flex h-10 w-full rounded-lg border border-[--input] bg-[--background] px-3 text-sm"
              aria-label="Suchradius auswählen"
            >
              {UMKREIS_OPTIONEN.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            onClick={() => setFilterOpen((o) => !o)}
            className="gap-2 self-end relative"
            aria-expanded={filterOpen}
            aria-controls="filter-panel"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filter
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[--primary] text-white text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          <Button onClick={() => suchen()} disabled={loading || plz.length !== 5} className="gap-2 self-end">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            Suchen
          </Button>
        </div>

        {/* Erweiterter Filter */}
        {filterOpen && (
          <div id="filter-panel" className="mt-4 pt-4 border-t border-[--border] grid sm:grid-cols-3 gap-4">
            {/* Kostenträger */}
            <div>
              <label className="text-xs font-medium text-[--muted-foreground] mb-1.5 block">Kostenträger</label>
              <select
                value={kostentraeger}
                onChange={(e) => setKostentraeger(e.target.value as Kostentraeger | "")}
                className="flex h-9 w-full rounded-lg border border-[--input] bg-[--background] px-3 text-sm"
              >
                <option value="">Alle</option>
                {kostentraegerListe.map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Sortierung */}
            <div>
              <label className="text-xs font-medium text-[--muted-foreground] mb-1.5 block">Sortierung</label>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" aria-hidden="true" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="flex-1 h-9 rounded-lg border border-[--input] bg-[--background] px-3 text-sm"
                >
                  {Object.entries(SORT_OPTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nur Verifiziert */}
            <div className="flex items-center gap-3 pt-5">
              <button
                role="switch"
                aria-checked={nurVerifiziert}
                onClick={() => setNurVerifiziert((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${nurVerifiziert ? "bg-[--primary]" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${nurVerifiziert ? "translate-x-4" : ""}`} />
              </button>
              <span className="text-sm">Nur Verifizierte</span>
            </div>

            {activeFiltersCount > 0 && (
              <div className="sm:col-span-3 flex gap-2 flex-wrap">
                {kostentraeger && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setKostentraeger("")}>
                    {KOSTENTRAEGER[kostentraeger]} <X className="h-3 w-3" />
                  </Badge>
                )}
                {nurVerifiziert && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setNurVerifiziert(false)}>
                    Verifiziert <X className="h-3 w-3" />
                  </Badge>
                )}
                <button onClick={resetFilter} className="text-xs text-[--muted-foreground] hover:text-[--foreground]">
                  Alle zurücksetzen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filter Chips — visible even when filter panel is closed */}
      {activeFiltersCount > 0 && !filterOpen && (
        <div className="flex flex-wrap gap-2 mb-4 -mt-2" aria-label="Aktive Filter">
          {kostentraeger && (
            <button
              onClick={() => setKostentraeger("")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[--primary]/10 text-[--primary] border border-[--primary]/20 hover:bg-[--primary]/20 transition-colors"
            >
              {KOSTENTRAEGER[kostentraeger]}
              <X className="h-3 w-3" />
            </button>
          )}
          {nurVerifiziert && (
            <button
              onClick={() => setNurVerifiziert(false)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
            >
              ✓ Nur Verifizierte
              <X className="h-3 w-3" />
            </button>
          )}
          {sortBy !== "relevanz" && (
            <button
              onClick={() => setSortBy("relevanz")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[--muted] text-[--foreground] border border-[--border] hover:bg-[--border] transition-colors"
            >
              Sortierung: {SORT_OPTIONS[sortBy]}
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={resetFilter}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors underline-offset-2 hover:underline"
          >
            Alle zurücksetzen
          </button>
        </div>
      )}

      {/* Kategorie-Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide" role="tablist" aria-label="Leistungskategorien">
        {KATEGORIE_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={kategorie === tab.key}
            onClick={() => handleKategorieTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
              kategorie === tab.key
                ? "bg-[--primary] text-white shadow-sm"
                : "bg-[--card] border border-[--border] text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary]"
            }`}
          >
            <span aria-hidden="true">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results area */}
      {gesucht && (
        <div>
          {/* Results header with view toggle */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              {loading ? (
                <p className="text-sm text-[--muted-foreground]">Suche läuft…</p>
              ) : (
                <p className="text-sm text-[--muted-foreground]">
                  <span className="font-semibold text-[--foreground]">{ergebnisse.length}</span> Anbieter gefunden
                  {sortBy !== "relevanz" && ` · ${SORT_OPTIONS[sortBy]}`}
                </p>
              )}
            </div>

            {/* View mode toggle */}
            {ergebnisse.length > 0 && (
              <div className="flex rounded-lg border border-[--border] overflow-hidden" role="group" aria-label="Ansicht wechseln">
                <button
                  onClick={() => setViewMode("liste")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "liste" ? "bg-[--primary] text-white" : "bg-[--card] text-[--muted-foreground] hover:bg-[--muted]"
                  }`}
                  aria-pressed={viewMode === "liste"}
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" /> Liste
                </button>
                <button
                  onClick={() => setViewMode("karte")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "karte" ? "bg-[--primary] text-white" : "bg-[--card] text-[--muted-foreground] hover:bg-[--muted]"
                  }`}
                  aria-pressed={viewMode === "karte"}
                >
                  <Map className="h-3.5 w-3.5" aria-hidden="true" /> Karte
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[--primary]" aria-label="Lädt…" />
            </div>
          )}

          {!loading && ergebnisse.length === 0 && (
            <div className="text-center py-16 text-[--muted-foreground]">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" aria-hidden="true" />
              <p className="font-medium mb-1">Keine Anbieter gefunden</p>
              <p className="text-sm">Versuchen Sie einen anderen Umkreis oder weniger Filter.</p>
            </div>
          )}

          {!loading && ergebnisse.length > 0 && (
            viewMode === "liste" ? (
              <div className="space-y-3" role="list" aria-label="Suchergebnisse">
                {ergebnisse.map((a) => (
                  <div key={a.id} role="listitem">
                    <AnbieterKarte
                      anbieter={a}
                      avgSterne={a._avgSterne}
                      bewertungenCount={a._bewertungenCount}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <KartenAnsicht
                anbieter={ergebnisse.map((a) => ({
                  id: a.id,
                  name: a.name,
                  lat: a.lat ?? null,
                  lng: a.lng ?? null,
                  ort: a.ort ?? null,
                  plz: a.plz ?? null,
                  verifiziert: a.verifiziert,
                }))}
              />
            )
          )}
        </div>
      )}

      {!gesucht && (
        <div className="text-center py-16 text-[--muted-foreground]">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20" aria-hidden="true" />
          <p className="font-medium mb-1">Geben Sie eine Postleitzahl ein</p>
          <p className="text-sm">Wir zeigen Ihnen Anbieter in Ihrer Nähe.</p>
        </div>
      )}
    </div>
  );
}
