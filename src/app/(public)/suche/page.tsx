"use client";

import { useState, useCallback, useEffect } from "react";
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
  const [sortBy, setSortBy] = useState<SortOption>("relevanz");
  const [ergebnisse, setErgebnisse] = useState<ErgebnisAnbieter[]>([]);
  const [loading, setLoading] = useState(false);
  const [gesucht, setGesucht] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("liste");
  const [saving, setSaving] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const supabase = createClient();

  const activeFiltersCount = [
    kostentraeger !== "",
    nurVerifiziert,
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
        const scoreB = (b.verifiziert ? 100 : 0) + (b._avgSterne ?? 0)