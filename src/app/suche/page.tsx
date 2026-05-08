"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AnbieterKarte } from "@/components/suche/AnbieterKarte";
import { createClient } from "@/lib/supabase/client";
import { LEISTUNGSKATEGORIEN, UMKREIS_OPTIONEN } from "@/lib/constants";
import type { AnbieterMitLeistungen, LeistungsKategorie } from "@/lib/types";

export default function SuchePage() {
  const [plz, setPlz] = useState("");
  const [umkreis, setUmkreis] = useState(20);
  const [kategorie, setKategorie] = useState<LeistungsKategorie | "">("");
  const [ergebnisse, setErgebnisse] = useState<AnbieterMitLeistungen[]>([]);
  const [loading, setLoading] = useState(false);
  const [gesucht, setGesucht] = useState(false);
  const supabase = createClient();

  async function suchen() {
    if (!plz || !/^\d{5}$/.test(plz)) return;
    setLoading(true);
    setGesucht(true);

    let query = supabase
      .from("anbieter")
      .select(`
        *,
        leistungen (*)
      `)
      .eq("aktiv", true)
      .order("verifiziert", { ascending: false })
      .order("name");

    // PLZ-Näherungsfilter (die ersten 2 oder 3 Stellen)
    if (plz.length === 5) {
      query = query.ilike("plz", plz.substring(0, 2) + "%");
    }

    const { data, error } = await query.limit(20);

    if (!error && data) {
      // Kategorie-Filter client-seitig
      const gefiltert = data.filter((a: AnbieterMitLeistungen) => {
        if (!kategorie) return true;
        return a.leistungen?.some((l) => l.kategorie === kategorie);
      });
      setErgebnisse(gefiltert);
    }
    setLoading(false);
  }

  const kategorienListe = Object.entries(LEISTUNGSKATEGORIEN) as [LeistungsKategorie, string][];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Anbieter suchen</h1>
        <p className="text-[--muted-foreground]">
          Finden Sie geprüfte Pflegedienste, Beratungsstellen und Sozialdienstleister in Ihrer Nähe.
        </p>
      </div>

      {/* Suchmaske */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-6 mb-8 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Postleitzahl
            </Label>
            <Input
              placeholder="z.B. 10115"
              value={plz}
              maxLength={5}
              onChange={(e) => setPlz(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && suchen()}
            />
          </div>
          <div className="space-y-1.5 w-32">
            <Label>Umkreis</Label>
            <select
              value={umkreis}
              onChange={(e) => setUmkreis(Number(e.target.value))}
              className="flex h-10 w-full rounded-lg border border-[--input] bg-[--background] px-3 py-2 text-sm"
            >
              {UMKREIS_OPTIONEN.map((km) => (
                <option key={km} value={km}>{km} km</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <Label className="flex items-center gap-1.5">
              <Filter className="h-4 w-4" /> Leistungsart (optional)
            </Label>
            <select
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value as LeistungsKategorie | "")}
              className="flex h-10 w-full rounded-lg border border-[--input] bg-[--background] px-3 py-2 text-sm"
            >
              <option value="">Alle Leistungen</option>
              {kategorienListe.map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Button onClick={suchen} className="gap-2 h-10" disabled={loading || plz.length !== 5}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Suchen
          </Button>
        </div>
      </div>

      {/* Ergebnisse */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[--primary]" />
        </div>
      )}

      {gesucht && !loading && ergebnisse.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl font-medium mb-2">Keine Anbieter gefunden</p>
          <p className="text-[--muted-foreground]">
            Versuchen Sie einen größeren Umkreis oder eine andere Leistungsart.
          </p>
        </div>
      )}

      {ergebnisse.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-sm text-[--muted-foreground]">
              <span className="font-semibold text-[--foreground]">{ergebnisse.length}</span> Anbieter gefunden
            </p>
            {kategorie && (
              <Badge variant="secondary" className="gap-1">
                {LEISTUNGSKATEGORIEN[kategorie]}
                <button onClick={() => setKategorie("")} className="ml-1 hover:text-[--foreground]">×</button>
              </Badge>
            )}
          </div>
          <div className="grid gap-4">
            {ergebnisse.map((a) => (
              <AnbieterKarte key={a.id} anbieter={a} />
            ))}
          </div>
        </div>
      )}

      {!gesucht && (
        <div className="text-center py-20 text-[--muted-foreground]">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Geben Sie eine PLZ ein, um Anbieter in Ihrer Nähe zu finden</p>
        </div>
      )}
    </div>
  );
}
