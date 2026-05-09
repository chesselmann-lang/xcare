"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Loader2, MapPin, X, SlidersHorizontal,
  ArrowUpDown, CheckCircle2, Map, List, Bookmark, BookmarkCheck
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
  const [suchtext, setSuchtext] = useState(searchParams.get("q") ?? "");
  const [umkreis, setUmkreis] = useState(20);
  const [kategorie, setKategorie] = useState<LeistungsKategorie | "">(
    (searchParams.get("kategorie") as LeistungsKategorie | null) ?? ""
  );
  const [kostentraeger, setKostentraeger] = useState<Kostentraeger | "">("");
  const [nurVerifiziert, setNurVerifiziert] = useState(false);
  const [nurVerfuegbar, setNurVerfuegbar] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("relevanz");
  const [ergebnisse, setErgebnisse] = useState<ErgebnisAnbieter[]>([]);
  const [loading, setLoading] = useState(false);
  const [gesucht, setGesucht] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("liste");
  const [saving, setSaving] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [suchVerlauf, setSuchVerlauf] = useState<Array<{ label: string; plz: string; suchtext: string; kategorie: string }>>([]);
  // Stichwort-Autocomplete
  const [acSuggestions, setAcSuggestions] = useState<Array<{ id: string; name: string; ort: string }>>([]);
  const [acLoading, setAcLoading] = useState(false);
  const [showAc, setShowAc] = useState(false);
  const [acIndex, setAcIndex] = useState(-1);
  const acContainerRef = useRef<HTMLDivElement>(null);
  // PLZ/Ort-Autocomplete
  const [plzSuggestions, setPlzSuggestions] = useState<Array<{ plz: string; ort: string }>>([]);
  const [showPlzAc, setShowPlzAc] = useState(false);
  const [plzAcIndex, setPlzAcIndex] = useState(-1);
  const plzContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load Suchverlauf from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("xcare_suchverlauf");
      if (stored) setSuchVerlauf(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Debounced Autocomplete: fetch matching Anbieter names
  useEffect(() => {
    if (suchtext.trim().length < 2) {
      setAcSuggestions([]);
      setShowAc(false);
      return;
    }
    const timer = setTimeout(async () => {
      setAcLoading(true);
      const term = suchtext.trim();
      const { data } = await supabase
        .from("anbieter")
        .select("id, name, ort")
        .eq("aktiv", true)
        .or(`name.ilike.%${term}%,ort.ilike.%${term}%`)
        .limit(6);
      setAcSuggestions(data ?? []);
      setShowAc((data?.length ?? 0) > 0);
      setAcLoading(false);
      setAcIndex(-1);
    }, 250);
    return () => clearTimeout(timer);
  }, [suchtext, supabase]);

  // Close stichwort autocomplete on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (acContainerRef.current && !acContainerRef.current.contains(e.target as Node)) {
        setShowAc(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced PLZ/Ort-Autocomplete
  useEffect(() => {
    if (plz.trim().length < 2) {
      setPlzSuggestions([]);
      setShowPlzAc(false);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/plz-suggest?q=${encodeURIComponent(plz.trim())}`);
      if (res.ok) {
        const data: Array<{ plz: string; ort: string }> = await res.json();
        setPlzSuggestions(data);
        setShowPlzAc(data.length > 0);
        setPlzAcIndex(-1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [plz]);

  // Close PLZ autocomplete on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plzContainerRef.current && !plzContainerRef.current.contains(e.target as Node)) {
        setShowPlzAc(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeFiltersCount = [
    kostentraeger !== "",
    nurVerifiziert,
    !nurVerfuegbar,
    sortBy !== "relevanz",
  ].filter(Boolean).length;

  // Push URL params so searches are shareable / SEO-linkable
  const pushUrl = useCallback((newPlz: string, newKat: string, newQ: string) => {
    const params = new URLSearchParams();
    if (newPlz) params.set("plz", newPlz);
    if (newKat) params.set("kategorie", newKat);
    if (newQ) params.set("q", newQ);
    router.replace(`/suche${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [router]);

  const suchen = useCallback(async (overrideKategorie?: LeistungsKategorie | "") => {
    if (!plz || !/^\d{5}$/.test(plz)) return;
    setLoading(true);
    setGesucht(true);

    const kat = overrideKategorie !== undefined ? overrideKategorie : kategorie;
    pushUrl(plz, kat, suchtext);

    let query = supabase
      .from("anbieter")
      .select("*, leistungen(*)")
      .eq("aktiv", true)
      .ilike("plz", plz.substring(0, 2) + "%");

    // Full-text / trigram search on name, ort, beschreibung
    if (suchtext.trim().length >= 2) {
      const term = suchtext.trim();
      query = query.or(`name.ilike.%${term}%,ort.ilike.%${term}%,beschreibung.ilike.%${term}%`);
    }

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

      if (nurVerfuegbar) {
        gefiltert = gefiltert.filter((a) => !(a as { abwesend?: boolean }).abwesend);
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

      const slice = gefiltert.slice(0, 20);
      setErgebnisse(slice);

      // Save to Suchverlauf
      if (plz) {
        const katLabel = KATEGORIE_TABS.find((k) => k.key === kat)?.label;
        const label = [suchtext.trim() || null, katLabel || null, `PLZ ${plz}`]
          .filter(Boolean).join(" · ");
        const entry = { label, plz, suchtext: suchtext.trim(), kategorie: kat ?? "" };
        setSuchVerlauf((prev) => {
          const deduped = prev.filter(
            (e) => !(e.plz === entry.plz && e.suchtext === entry.suchtext && e.kategorie === entry.kategorie)
          );
          const next = [entry, ...deduped].slice(0, 5);
          try { localStorage.setItem("xcare_suchverlauf", JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
      }
    }
    setLoading(false);
  }, [plz, suchtext, kategorie, kostentraeger, nurVerifiziert, nurVerfuegbar, sortBy, supabase, pushUrl]);

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
    setNurVerfuegbar(true);
    setSortBy("relevanz");
  };

  const sucheSpeichern = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/suche");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) return;

      const label = [
        suchtext || null,
        plz ? `PLZ ${plz}` : null,
        kategorie || null,
      ].filter(Boolean).join(", ") || "Suche";

      const { error } = await supabase.from("gespeicherte_suchen").insert({
        profile_id: profile.id,
        name: label,
        plz: plz || null,
        radius_km: umkreis,
        lebenslage: kategorie || null,
        suchtext: suchtext || null,
      });
      if (!error) setGespeichert(true);
    } finally {
      setSaving(false);
    }
  };

  // Re-sort client-side when sortBy changes (avoids refetch)
  const sortedErgebnisse = useMemo(() => {
    return [...ergebnisse].sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "de");
      if (sortBy === "bewertung") return (b._avgSterne ?? 0) - (a._avgSterne ?? 0);
      if (sortBy === "verifiziert") {
        if (a.verifiziert && !b.verifiziert) return -1;
        if (!a.verifiziert && b.verifiziert) return 1;
        return 0;
      }
      // relevanz: verifiziert + rating score
      const scoreA = (a.verifiziert ? 100 : 0) + (a._avgSterne ?? 0) * 10;
      const scoreB = (b.verifiziert ? 100 : 0) + (b._avgSterne ?? 0) * 10;
      return scoreB - scoreA;
    });
  }, [ergebnisse, sortBy]);

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
          {/* Freitext-Suche mit Live-Autocomplete */}
          <div className="flex-1 min-w-48" ref={acContainerRef}>
            <label className="text-xs font-medium text-[--muted-foreground] mb-1.5 block">
              Stichwort (optional)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" aria-hidden="true" />
              {acLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[--muted-foreground] animate-spin" />
              )}
              <Input
                value={suchtext}
                onChange={(e) => { setSuchtext(e.target.value); setShowAc(true); }}
                onFocus={() => { if (acSuggestions.length > 0) setShowAc(true); }}
                onKeyDown={(e) => {
                  if (!showAc || acSuggestions.length === 0) {
                    if (e.key === "Enter") suchen();
                    return;
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setAcIndex((i) => Math.min(i + 1, acSuggestions.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setAcIndex((i) => Math.max(i - 1, -1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (acIndex >= 0 && acSuggestions[acIndex]) {
                      setSuchtext(acSuggestions[acIndex].name);
                      setShowAc(false);
                      setAcIndex(-1);
                    } else {
                      setShowAc(false);
                      suchen();
                    }
                  } else if (e.key === "Escape") {
                    setShowAc(false);
                    setAcIndex(-1);
                  }
                }}
                placeholder="z.B. Demenz, Physiotherapie…"
                className="pl-9"
                aria-label="Stichwort eingeben"
                aria-autocomplete="list"
                aria-expanded={showAc}
                autoComplete="off"
              />
              {/* Autocomplete Dropdown */}
              {showAc && acSuggestions.length > 0 && (
                <div
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-[--card] border border-[--border] rounded-xl shadow-lg overflow-hidden"
                  role="listbox"
                >
                  {acSuggestions.map((s, i) => (
                    <button
                      key={s.id}
                      role="option"
                      aria-selected={i === acIndex}
                      type="button"
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                        i === acIndex
                          ? "bg-[--primary] text-[--primary-foreground]"
                          : "hover:bg-[--muted]"
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSuchtext(s.name);
                        setShowAc(false);
                        setAcIndex(-1);
                      }}
                    >
                      <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="flex-1 truncate font-medium">{s.name}</span>
                      <span className="text-xs opacity-60 shrink-0">{s.ort}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PLZ / Ort Autocomplete */}
          <div className="flex-1 min-w-36" ref={plzContainerRef}>
            <label className="text-xs font-medium text-[--muted-foreground] mb-1.5 block">
              PLZ oder Ort
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" aria-hidden="true" />
              <Input
                value={plz}
                onChange={(e) => setPlz(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (!showPlzAc || plzSuggestions.length === 0) {
                    if (e.key === "Enter") suchen();
                    return;
                  }
                  if (e.key === "ArrowDown") { e.preventDefault(); setPlzAcIndex((i) => Math.min(i + 1, plzSuggestions.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setPlzAcIndex((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter") {
                    e.preventDefault();
                    if (plzAcIndex >= 0 && plzSuggestions[plzAcIndex]) {
                      const s = plzSuggestions[plzAcIndex];
                      setPlz(s.plz);
                      setShowPlzAc(false);
                    } else { suchen(); }
                  } else if (e.key === "Escape") { setShowPlzAc(false); }
                }}
                placeholder="PLZ oder Ort"
                className="pl-9"
                maxLength={20}
                aria-label="Postleitzahl oder Ort eingeben"
              />
              {showPlzAc && plzSuggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-[--border] bg-[--background] shadow-lg overflow-hidden">
                  {plzSuggestions.map((s, i) => (
                    <button
                      key={s.plz}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setPlz(s.plz); setShowPlzAc(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${i === plzAcIndex ? "bg-[--accent]" : "hover:bg-[--accent]/60"}`}
                    >
                      <MapPin className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" aria-hidden="true" />
                      <span className="font-medium">{s.plz}</span>
                      <span className="text-[--muted-foreground] truncate">{s.ort}</span>
                    </button>
                  ))}
                </div>
              )}
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

          {gesucht && (
            <Button
              variant="outline"
              onClick={sucheSpeichern}
              disabled={saving || gespeichert}
              className="gap-2 self-end"
              title="Suchanfrage speichern"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : gespeichert ? (
                <BookmarkCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {gespeichert ? "Gespeichert" : "Speichern"}
            </Button>
          )}
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

            {/* Nur Verfügbare */}
            <div className="flex items-center gap-3 pt-5">
              <button
                role="switch"
                aria-checked={nurVerfuegbar}
                onClick={() => setNurVerfuegbar((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${nurVerfuegbar ? "bg-[--primary]" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${nurVerfuegbar ? "translate-x-4" : ""}`} />
              </button>
              <span className="text-sm">Nur Verfügbare</span>
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
                {!nurVerfuegbar && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setNurVerfuegbar(true)}>
                    Inkl. Abwesende <X className="h-3 w-3" />
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

      {/* Suchverlauf */}
      {suchVerlauf.length > 0 && !gesucht && (
        <div className="flex flex-wrap items-center gap-2 mb-4 -mt-2">
          <span className="text-xs text-[--muted-foreground] shrink-0">Zuletzt gesucht:</span>
          {suchVerlauf.map((v, i) => (
            <button
              key={i}
              onClick={() => {
                setPlz(v.plz);
                setSuchtext(v.suchtext);
                setKategorie(v.kategorie as LeistungsKategorie | "");
                setTimeout(() => suchen(), 50);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[--muted] text-[--foreground] border border-[--border] hover:border-[--primary] hover:text-[--primary] transition-colors"
            >
              <Search className="h-3 w-3 shrink-0" />
              {v.label}
            </button>
          ))}
          <button
            onClick={() => {
              setSuchVerlauf([]);
              try { localStorage.removeItem("xcare_suchverlauf"); } catch { /* ignore */ }
            }}
            className="text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
          {!nurVerfuegbar && (
            <button
              onClick={() => setNurVerfuegbar(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              Inkl. Abwesende
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
          {/* Results header with sort + view toggle */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              {loading ? (
                <p className="text-sm text-[--muted-foreground]">Suche läuft…</p>
              ) : (
                <p className="text-sm text-[--muted-foreground]">
                  <span className="font-semibold text-[--foreground]">{sortedErgebnisse.length}</span> Anbieter gefunden
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Inline sort dropdown — always visible in results bar */}
              {!loading && sortedErgebnisse.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" aria-hidden="true" />
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as SortOption);
                      // Re-sort immediately without new network call
                    }}
                    className="h-8 rounded-lg border border-[--input] bg-[--background] px-2 text-xs font-medium text-[--foreground]"
                    aria-label="Sortierung"
                  >
                    {Object.entries(SORT_OPTIONS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* View mode toggle */}
              {sortedErgebnisse.length > 0 && (
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
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[--primary]" aria-label="Lädt…" />
            </div>
          )}

          {!loading && ergebnisse.length === 0 && (
            <div className="text-center py-12 text-[--muted-foreground]">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" aria-hidden="true" />
              <p className="font-medium mb-1 text-[--foreground]">Keine Anbieter gefunden</p>
              <p className="text-sm mb-6">Für PLZ {plz}{kategorie ? ` (${kategorie.replace(/_/g, " ")})` : ""} konnten wir keine Anbieter finden.</p>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                {umkreis < 50 && (
                  <button
                    onClick={() => { setUmkreis(50); suchen(); }}
                    className="px-4 py-2 rounded-full border border-[--border] bg-[--card] hover:border-[--primary] hover:text-[--primary] transition-colors"
                  >
                    Umkreis auf 50 km erweitern
                  </button>
                )}
                {kategorie && (
                  <button
                    onClick={() => handleKategorieTab("")}
                    className="px-4 py-2 rounded-full border border-[--border] bg-[--card] hover:border-[--primary] hover:text-[--primary] transition-colors"
                  >
                    Alle Kategorien anzeigen
                  </button>
                )}
                {(nurVerifiziert || !nurVerfuegbar) && (
                  <button
                    onClick={() => { resetFilter(); suchen(); }}
                    className="px-4 py-2 rounded-full border border-[--border] bg-[--card] hover:border-[--primary] hover:text-[--primary] transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && sortedErgebnisse.length > 0 && (
            viewMode === "liste" ? (
              <div className="space-y-3" role="list" aria-label="Suchergebnisse">
                {sortedErgebnisse.map((a) => (
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
                anbieter={sortedErgebnisse.map((a) => ({
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
