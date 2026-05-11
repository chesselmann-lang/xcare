"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const QUALIFIKATIONEN = [
  "Altenpfleger/in", "Gesundheits- und Krankenpfleger/in",
  "Pflegehelfer/in", "Pflegeassistenz",
  "Palliativpflege", "Demenzpflege",
  "Intensivpflege", "Wundversorgung",
  "Betreuungsassistenz §43b SGB XI",
  "Hauswirtschaft",
];

const SPRACHEN = [
  "Deutsch", "Englisch", "Türkisch", "Polnisch", "Russisch",
  "Arabisch", "Spanisch", "Italienisch", "Kroatisch", "Rumänisch",
];

interface FormState {
  vorname: string;
  nachname: string;
  geburtsjahr: string;
  qualifikationen: string[];
  sprachen: string[];
  berufserfahrung_jahre: string;
  stundensatz_ct: string;
  verfuegbar_ab: string;
  max_stunden_woche: string;
  fuehrungszeugnis_vorhanden: boolean;
  fuehrungszeugnis_datum: string;
  bio: string;
  plz: string;
  ort: string;
  lat: string;
  lng: string;
}

const DEFAULT_FORM: FormState = {
  vorname: "", nachname: "", geburtsjahr: "",
  qualifikationen: [], sprachen: [],
  berufserfahrung_jahre: "", stundensatz_ct: "",
  verfuegbar_ab: "", max_stunden_woche: "",
  fuehrungszeugnis_vorhanden: false, fuehrungszeugnis_datum: "",
  bio: "", plz: "", ort: "", lat: "", lng: "",
};

export function CareWorkerForm({ anbieterName }: { anbieterName: string }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const router = useRouter();

  const toggleArr = (key: "qualifikationen" | "sprachen", val: string) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val)
        ? f[key].filter(x => x !== val)
        : [...f[key], val],
    }));
  };

  const handleGeo = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation wird nicht unterstützt");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
        toast.success("Standort ermittelt");
      },
      () => {
        setGeoLoading(false);
        toast.error("Standort konnte nicht ermittelt werden");
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vorname || !form.nachname || !form.stundensatz_ct) {
      toast.error("Bitte Vorname, Nachname und Stundensatz angeben.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        vorname: form.vorname.trim(),
        nachname: form.nachname.trim(),
        qualifikationen: form.qualifikationen,
        sprachen: form.sprachen,
        stundensatz_ct: Math.round(parseFloat(form.stundensatz_ct) * 100),
        fuehrungszeugnis_vorhanden: form.fuehrungszeugnis_vorhanden,
        bio: form.bio.trim() || undefined,
        plz: form.plz.trim() || undefined,
        ort: form.ort.trim() || undefined,
      };
      if (form.geburtsjahr) payload.geburtsjahr = parseInt(form.geburtsjahr);
      if (form.berufserfahrung_jahre) payload.berufserfahrung_jahre = parseInt(form.berufserfahrung_jahre);
      if (form.verfuegbar_ab) payload.verfuegbar_ab = form.verfuegbar_ab;
      if (form.max_stunden_woche) payload.max_stunden_woche = parseInt(form.max_stunden_woche);
      if (form.fuehrungszeugnis_datum) payload.fuehrungszeugnis_datum = form.fuehrungszeugnis_datum;
      if (form.lat && form.lng) {
        payload.lat = parseFloat(form.lat);
        payload.lng = parseFloat(form.lng);
      }

      const res = await fetch("/api/care-workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Fehler beim Anlegen");
      }
      toast.success("Pflegekraft erfolgreich angelegt!");
      setForm(DEFAULT_FORM);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Persönliche Daten */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="vorname">Vorname *</Label>
          <Input id="vorname" value={form.vorname}
            onChange={e => setForm(f => ({ ...f, vorname: e.target.value }))}
            placeholder="Maria" required />
        </div>
        <div>
          <Label htmlFor="nachname">Nachname *</Label>
          <Input id="nachname" value={form.nachname}
            onChange={e => setForm(f => ({ ...f, nachname: e.target.value }))}
            placeholder="Mustermann" required />
        </div>
        <div>
          <Label htmlFor="geburtsjahr">Geburtsjahr</Label>
          <Input id="geburtsjahr" type="number" min="1940" max="2005"
            value={form.geburtsjahr}
            onChange={e => setForm(f => ({ ...f, geburtsjahr: e.target.value }))}
            placeholder="1975" />
        </div>
      </div>

      {/* Qualifikationen */}
      <div>
        <Label className="mb-2 block">Qualifikationen</Label>
        <div className="flex flex-wrap gap-2">
          {QUALIFIKATIONEN.map(q => (
            <button key={q} type="button"
              onClick={() => toggleArr("qualifikationen", q)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                form.qualifikationen.includes(q)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >{q}</button>
          ))}
        </div>
      </div>

      {/* Sprachen */}
      <div>
        <Label className="mb-2 block">Sprachen</Label>
        <div className="flex flex-wrap gap-2">
          {SPRACHEN.map(s => (
            <button key={s} type="button"
              onClick={() => toggleArr("sprachen", s)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                form.sprachen.includes(s)
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Konditionen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="stundensatz">Stundensatz (€) *</Label>
          <Input id="stundensatz" type="number" min="5" max="200" step="0.50"
            value={form.stundensatz_ct}
            onChange={e => setForm(f => ({ ...f, stundensatz_ct: e.target.value }))}
            placeholder="18.50" required />
        </div>
        <div>
          <Label htmlFor="berufserfahrung">Berufserfahrung (Jahre)</Label>
          <Input id="berufserfahrung" type="number" min="0" max="60"
            value={form.berufserfahrung_jahre}
            onChange={e => setForm(f => ({ ...f, berufserfahrung_jahre: e.target.value }))}
            placeholder="5" />
        </div>
        <div>
          <Label htmlFor="max_stunden">Max. Std./Woche</Label>
          <Input id="max_stunden" type="number" min="1" max="60"
            value={form.max_stunden_woche}
            onChange={e => setForm(f => ({ ...f, max_stunden_woche: e.target.value }))}
            placeholder="40" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="verfuegbar_ab">Verfügbar ab</Label>
          <Input id="verfuegbar_ab" type="date"
            value={form.verfuegbar_ab}
            onChange={e => setForm(f => ({ ...f, verfuegbar_ab: e.target.value }))} />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label>Führungszeugnis vorhanden</Label>
            <div className="flex items-center gap-3 mt-2">
              <input type="checkbox" id="fz"
                checked={form.fuehrungszeugnis_vorhanden}
                onChange={e => setForm(f => ({ ...f, fuehrungszeugnis_vorhanden: e.target.checked }))}
                className="w-4 h-4" />
              <label htmlFor="fz" className="text-sm text-gray-700">Ja, vorhanden</label>
            </div>
          </div>
          {form.fuehrungszeugnis_vorhanden && (
            <div className="flex-1">
              <Label htmlFor="fz_datum">Datum</Label>
              <Input id="fz_datum" type="date"
                value={form.fuehrungszeugnis_datum}
                onChange={e => setForm(f => ({ ...f, fuehrungszeugnis_datum: e.target.value }))} />
            </div>
          )}
        </div>
      </div>

      {/* Standort */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Standort (für Radius-Suche)</Label>
          <button type="button" onClick={handleGeo} disabled={geoLoading}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            {geoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
            Aktuellen Standort verwenden
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input placeholder="PLZ" maxLength={5} value={form.plz}
            onChange={e => setForm(f => ({ ...f, plz: e.target.value }))} />
          <Input placeholder="Ort" value={form.ort}
            onChange={e => setForm(f => ({ ...f, ort: e.target.value }))} />
          <Input placeholder="Breitengrad" value={form.lat}
            onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
          <Input placeholder="Längengrad" value={form.lng}
            onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
        </div>
        {form.lat && form.lng && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Koordinaten gesetzt ({parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)})
          </p>
        )}
      </div>

      {/* Bio */}
      <div>
        <Label htmlFor="bio">Kurzbeschreibung / Vorstellung</Label>
        <Textarea id="bio" rows={3} maxLength={2000}
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          placeholder={`Erfahrene Pflegekraft bei ${anbieterName}...`} />
        <p className="text-xs text-gray-400 mt-1">{form.bio.length}/2000 Zeichen</p>
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
        Pflegekraft anlegen
      </Button>
    </form>
  );
}
