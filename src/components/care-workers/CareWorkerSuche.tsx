"use client";

import { useState, useCallback } from "react";
import { Search, MapPin, Loader2, SlidersHorizontal, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CareWorkerCard } from "./CareWorkerCard";

const QUALIFIKATIONEN = [
  "Altenpfleger/in", "Gesundheits- und Krankenpfleger/in",
  "Pflegehelfer/in", "Pflegeassistenz",
  "Palliativpflege", "Demenzpflege",
  "Intensivpflege", "Betreuungsassistenz §43b SGB XI",
];

const SPRACHEN = [
  "Deutsch", "Englisch", "Türkisch", "Polnisch", "Russisch",
  "Arabisch", "Spanisch",
];

type CareWorker = {
  id: string;
  vorname: string;
  nachname: string;
  qualifikationen: string[];
  sprachen: string[];
  berufserfahrung_jahre?: number | null;
  stundensatz_ct: number;
  verfuegbar_ab?: string | null;
  max_stunden_woche?: number | null;
  fuehrungszeugnis_vorhanden: boolean;
  bio?: string | null;
  plz?: string | null;
  ort?: string | null;
  aktiv: boolean;
  entfernung_m?: number | null;
  anbieter_id?: string;
  anbieter_name?: string;
  anbieter_verifiziert?: boolean;
};

export function CareWorkerSuche() {
  const [plz, setPlz] = useState("");
  const [radius, setRadius] = useState("25");
  const [qualifikation, setQualifikation] = useState("");
  const [sprache, setSprache] = useState("");
  const [maxStundensatz, setMaxStundensatz] = useState("");
  const [nurFuehrungszeugnis, setNurFuehrungszeugnis] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [results, setResults] = useState<CareWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleGeoLocate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation nicht verfügbar");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast.success("Standort ermittelt — jetzt suchen");
      },
      () => {
        setGeoLoading(false);
        toast.error("Standort konnte nicht ermittelt werden");
      }
    );
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (coords) {
        params.set("lat", coords.lat.toString());
        params.set("lng", coords.lng.toString());
        params.set("radius_km", radius);
      }
      if (qualifikation) params.set("qualifikation", qualifikation);
      if (sprache) params.set("sprache", sprache);
      if (maxStundensatz) params.set("max_stundensatz_ct", (parseFloat(maxStundensatz) * 100).toString());
      if (nurFuehrungszeugnis) params.set("fuehrungszeugnis", "true");
      params.set("limit", "24");

      const res = await fetch(`/api/care-workers?${params}`);
      if (!res.ok) throw new Error("Suche fehlgeschlagen");
      const data = await res.json();
      setResults(data);
    } catch {
      toast.error("Suche fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setQualifikation("");
    setSprache("");
    setMaxStundensatz("");
    setNurFuehrungszeugnis(false);
  };

  const activeFilters = [qualifikation, sprache, maxStundensatz, nurFuehrungszeugnis ? "fz" : ""].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Suchleiste */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {/* Standort-Zeile */}
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <Label htmlFor="plz" className="text-sm">PLZ / Ort</Label>
            <Input
              id="plz"
              value={plz}
              onChange={e => setPlz(e.target.value)}
              placeholder="z.B. 80331 München"
              className="mt-1"
            />
          </div>
          <div className="w-32">
            <Label className="text-sm">Radius (km)</Label>
            <select
              value={radius}
              onChange={e => setRadius(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {["5","10","15","25","50","100"].map(r => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleGeoLocate}
            disabled={geoLoading}
            className="flex items-center gap-2 text-sm shrink-0"
          >
            {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {coords ? "Standort ✓" : "Mein Standort"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 text-sm shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeFilters > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
          <Button onClick={handleSearch} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Suchen
          </Button>
        </div>

        {/* Erweiterte Filter */}
        {showFilter && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Qualifikation */}
              <div>
                <Label className="text-sm mb-1 block">Qualifikation</Label>
                <select
                  value={qualifikation}
                  onChange={e => setQualifikation(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle</option>
                  {QUALIFIKATIONEN.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              {/* Sprache */}
              <div>
                <Label className="text-sm mb-1 block">Sprache</Label>
                <select
                  value={sprache}
                  onChange={e => setSprache(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle</option>
                  {SPRACHEN.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Max. Stundensatz */}
              <div>
                <Label className="text-sm mb-1 block">Max. Stundensatz (€)</Label>
                <Input
                  type="number" min="5" max="200" step="0.50"
                  value={maxStundensatz}
                  onChange={e => setMaxStundensatz(e.target.value)}
                  placeholder="z.B. 25.00"
                />
              </div>
            </div>
            {/* Führungszeugnis */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fz_filter"
                checked={nurFuehrungszeugnis}
                onChange={e => setNurFuehrungszeugnis(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="fz_filter" className="text-sm text-gray-700">
                Nur mit Führungszeugnis
              </label>
            </div>
            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ergebnisse */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          Suche läuft...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">
            Keine Pflegekräfte gefunden.<br />
            Versuchen Sie einen größeren Radius oder andere Filter.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-sm text-gray-500">
            {results.length} Pflegekraft{results.length !== 1 ? "kräfte" : ""} gefunden
            {coords && ` im Umkreis von ${radius} km`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map(worker => (
              <CareWorkerCard key={worker.id} worker={worker} />
            ))}
          </div>
        </>
      )}

      {!searched && (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Geben Sie Ihren Standort an oder nutzen Sie Ihren aktuellen Standort,<br />
          dann klicken Sie auf &quot;Suchen&quot;.
        </div>
      )}
    </div>
