"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnspruchsErgebnis, AnspruchsInput } from "@/lib/anspruch/types";
import {
  CheckCircle,
  AlertCircle,
  Euro,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
  Save,
  ShieldCheck,
} from "lucide-react";

interface Props {
  lebenslage: AnspruchsInput["lebenslage"];
}

interface FormState {
  // Basis
  alter: string;
  familienstand: AnspruchsInput["familienstand"];
  wohnform: AnspruchsInput["wohnform"];
  // Pflege
  pflegegrad: string;
  pflegeDurchAngehoerige: boolean;
  // Behinderung
  gdb: string;
  // Kinder
  kinderAnzahl: string;
  kindAlter1: string;  // Alter erstes Kind (für BEEG)
  // Finanzen
  zvE: string;
  haushaltshilfeEur: string;
  pflegeEur: string;
  erwerbstaetig: boolean;
  // Lebenslage-spezifisch
  versicherungsart: AnspruchsInput["versicherungsart"];
}

const LEBENSLAGE_PFLEGE_RELEVANT: AnspruchsInput["lebenslage"][] = [
  "alter_pflege", "hospiz_palliativ", "eingliederung_behinderung",
];
const LEBENSLAGE_KINDER_RELEVANT: AnspruchsInput["lebenslage"][] = [
  "geburt_fruehe_kindheit", "schulkind_jugend", "erwerbsleben_vereinbarkeit",
];
const LEBENSLAGE_GDB_RELEVANT: AnspruchsInput["lebenslage"][] = [
  "eingliederung_behinderung", "krankheit_genesung",
];
const LEBENSLAGE_RENTE_RELEVANT: AnspruchsInput["lebenslage"][] = [
  "trauer_nachlass", "krankheit_genesung", "alter_pflege",
];

export function AnspruchsRechnerMitSpeichern({ lebenslage }: Props) {
  const router = useRouter();
  const [schritt, setSchritt] = useState<"eingabe" | "ergebnis">("eingabe");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ergebnis, setErgebnis] = useState<AnspruchsErgebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aufgeklappt, setAufgeklappt] = useState<Set<string>>(new Set());
  const [bezeichnung, setBezeichnung] = useState("");

  const [form, setForm] = useState<FormState>({
    alter: "",
    familienstand: "ledig",
    wohnform: "privat",
    pflegegrad: "",
    pflegeDurchAngehoerige: true,
    gdb: "",
    kinderAnzahl: "0",
    kindAlter1: "0",
    zvE: "",
    haushaltshilfeEur: "",
    pflegeEur: "",
    erwerbstaetig: false,
    versicherungsart: "gkv",
  });

  const zeigePflege = LEBENSLAGE_PFLEGE_RELEVANT.includes(lebenslage);
  const zeigeKinder = LEBENSLAGE_KINDER_RELEVANT.includes(lebenslage);
  const zeigeGdb = LEBENSLAGE_GDB_RELEVANT.includes(lebenslage);
  const zeigeRente = LEBENSLAGE_RENTE_RELEVANT.includes(lebenslage);

  const handleBerechnen = async () => {
    if (!form.alter) {
      setFehler("Bitte Alter angeben.");
      return;
    }
    setFehler(null);
    setLoading(true);
    setSaved(false);

    const kinderAnz = Number(form.kinderAnzahl);
    const kindAlter = Number(form.kindAlter1) || 0;
    const kinder =
      kinderAnz > 0
        ? Array.from({ length: kinderAnz }, (_, i) => ({
            alter: Math.max(0, kindAlter + i),
          }))
        : undefined;

    const input: AnspruchsInput = {
      lebenslage,
      alter: Number(form.alter),
      familienstand: form.familienstand,
      wohnform: form.wohnform,
      versicherungsart: form.versicherungsart,
      pflegegrad: form.pflegegrad
        ? (Number(form.pflegegrad) as AnspruchsInput["pflegegrad"])
        : undefined,
      gdb: form.gdb ? (Number(form.gdb) as AnspruchsInput["gdb"]) : undefined,
      kinder,
      haushaltshilfe_aufwendungen_eur: form.haushaltshilfeEur
        ? Number(form.haushaltshilfeEur)
        : undefined,
      pflege_aufwendungen_eur: form.pflegeEur ? Number(form.pflegeEur) : undefined,
      zu_versteuerndes_einkommen_eur: form.zvE ? Number(form.zvE) : undefined,
      pflege_durch_angehoerige: zeigePflege ? form.pflegeDurchAngehoerige : undefined,
      erwerbstaetig: form.erwerbstaetig,
    };

    try {
      const res = await fetch("/api/anspruch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Fehler bei der Berechnung");
      }

      const data: AnspruchsErgebnis = await res.json();
      setErgebnis(data);
      setSchritt("ergebnis");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeichern = async () => {
    if (!ergebnis) return;
    setSaving(true);
    try {
      const res = await fetch("/api/anspruch/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ergebnis,
          lebenslage,
          bezeichnung: bezeichnung || undefined,
          gesamt_monatlich_eur: ergebnis.gesamt_monatlich_eur,
          gesamt_jaehrlich_eur: ergebnis.gesamt_jaehrlich_eur,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleAufgeklappt = (id: string) => {
    setAufgeklappt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (schritt === "ergebnis" && ergebnis) {
    return (
      <div className="space-y-6">
        <ErgebnisAnsicht
          ergebnis={ergebnis}
          aufgeklappt={aufgeklappt}
          toggle={toggleAufgeklappt}
        />

        {/* Speichern-Bereich */}
        <Card className="p-4 border-blue-200 bg-blue-50">
          <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Ergebnis speichern
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={bezeichnung}
              onChange={(e) => setBezeichnung(e.target.value)}
              placeholder="Bezeichnung (z.B. „Mutter, PG 3")"
              className="flex-1 border border-blue-200 rounded-md px-3 py-1.5 text-sm bg-white"
              maxLength={100}
            />
            <Button
              onClick={handleSpeichern}
              disabled={saving || saved}
              size="sm"
              className="flex-shrink-0"
            >
              {saved ? "✓ Gespeichert" : saving ? "…" : "Speichern"}
            </Button>
          </div>
          {saved && (
            <p className="text-xs text-blue-600 mt-1">
              Berechnung unter „Gespeicherte Berechnungen" abrufbar.
            </p>
          )}
        </Card>

        <Button variant="outline" onClick={() => { setSchritt("eingabe"); setSaved(false); }} className="w-full">
          ← Neue Berechnung
        </Button>
      </div>
    );
  }

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Anspruchs-Rechner
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Deterministisch · Kein KI-Urteil · Stand 2025 · Regelbasiert nach SGB XI/XII, BEEG, WoGG, SGB V/VI
        </p>
      </div>

      <div className="space-y-4">
        {/* IMMER: Alter */}
        <FormField label="Alter der Person *">
          <input
            type="number" min={0} max={120}
            value={form.alter}
            onChange={(e) => setForm((f) => ({ ...f, alter: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="z.B. 75"
          />
        </FormField>

        {/* IMMER: Familienstand */}
        <FormField label="Familienstand">
          <select
            value={form.familienstand}
            onChange={(e) => setForm((f) => ({ ...f, familienstand: e.target.value as AnspruchsInput["familienstand"] }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="ledig">Ledig / Alleinstehend</option>
            <option value="verheiratet">Verheiratet</option>
            <option value="eingetragen">Eingetragene Lebenspartnerschaft</option>
            <option value="geschieden">Geschieden</option>
            <option value="verwitwet">Verwitwet</option>
          </select>
        </FormField>

        {/* IMMER: Wohnform */}
        <FormField label="Wohnform">
          <select
            value={form.wohnform}
            onChange={(e) => setForm((f) => ({ ...f, wohnform: e.target.value as AnspruchsInput["wohnform"] }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="privat">Eigene Wohnung / Haus</option>
            <option value="wohngemeinschaft">Ambulant betreute Pflege-WG</option>
            <option value="betreutes_wohnen">Betreutes Wohnen</option>
            <option value="heim">Pflegeheim (stationär)</option>
          </select>
        </FormField>

        {/* PFLEGE-Lebenslagen */}
        {zeigePflege && (
          <>
            <FormField label="Pflegegrad (falls vorhanden)">
              <select
                value={form.pflegegrad}
                onChange={(e) => setForm((f) => ({ ...f, pflegegrad: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Noch kein Pflegegrad / Unbekannt</option>
                <option value="1">Pflegegrad 1</option>
                <option value="2">Pflegegrad 2</option>
                <option value="3">Pflegegrad 3</option>
                <option value="4">Pflegegrad 4</option>
                <option value="5">Pflegegrad 5</option>
              </select>
            </FormField>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pflegeDurchAngehoerige}
                onChange={(e) => setForm((f) => ({ ...f, pflegeDurchAngehoerige: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Pflege durch Angehörige / Freunde (nicht beruflich)
            </label>
          </>
        )}

        {/* GDB-Lebenslagen */}
        {zeigeGdb && (
          <FormField label="Grad der Behinderung (GdB) – falls anerkannt">
            <select
              value={form.gdb}
              onChange={(e) => setForm((f) => ({ ...f, gdb: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Kein / Unbekannt</option>
              <option value="20">GdB 20</option>
              <option value="30">GdB 30</option>
              <option value="40">GdB 40</option>
              <option value="50">GdB 50 (Schwerbehindert)</option>
              <option value="60">GdB 60</option>
              <option value="70">GdB 70</option>
              <option value="80">GdB 80</option>
              <option value="90">GdB 90</option>
              <option value="100">GdB 100</option>
            </select>
          </FormField>
        )}

        {/* KINDER-Lebenslagen */}
        {zeigeKinder && (
          <>
            <FormField label="Anzahl Kinder im Haushalt">
              <input
                type="number" min={0} max={10}
                value={form.kinderAnzahl}
                onChange={(e) => setForm((f) => ({ ...f, kinderAnzahl: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </FormField>
            {Number(form.kinderAnzahl) > 0 && (
              <FormField label="Alter des jüngsten Kindes (Jahre)">
                <input
                  type="number" min={0} max={25}
                  value={form.kindAlter1}
                  onChange={(e) => setForm((f) => ({ ...f, kindAlter1: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="z.B. 0 (Neugeborenes)"
                />
              </FormField>
            )}
          </>
        )}

        {/* Kinder bei Trauer/Nachlass */}
        {lebenslage === "trauer_nachlass" && (
          <FormField label="Anzahl Kinder (für Witwen-/Waisenrente)">
            <input
              type="number" min={0} max={10}
              value={form.kinderAnzahl}
              onChange={(e) => setForm((f) => ({ ...f, kinderAnzahl: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </FormField>
        )}

        {/* FINANZEN: Einkommen (relevant für fast alle) */}
        <FormField label="Jährl. zu versteuerndes Einkommen (€) – optional">
          <input
            type="number" min={0}
            value={form.zvE}
            onChange={(e) => setForm((f) => ({ ...f, zvE: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="z.B. 24000 (verbessert Genauigkeit)"
          />
        </FormField>

        {/* § 35a EStG */}
        <FormField label="Jährl. Ausgaben Haushaltshilfe (€) – für § 35a EStG">
          <input
            type="number" min={0}
            value={form.haushaltshilfeEur}
            onChange={(e) => setForm((f) => ({ ...f, haushaltshilfeEur: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="z.B. 3600"
          />
        </FormField>

        {/* Erwerbstätigkeit */}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.erwerbstaetig}
            onChange={(e) => setForm((f) => ({ ...f, erwerbstaetig: e.target.checked }))}
            className="rounded border-gray-300"
          />
          Erwerbstätig (beeinflusst § 35a EStG und Elterngeld)
        </label>
      </div>

      {fehler && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {fehler}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
        <Info className="w-4 h-4 flex-shrink-0" />
        Kein KI-Modell trifft die Leistungsentscheidung. Alle Berechnungen erfolgen deterministisch
        nach SGB XI/XII, BEEG, WoGG, SGB V/VI (Stand 2025). Das Ergebnis ersetzt keine Rechtsberatung.
      </div>

      <Button onClick={handleBerechnen} disabled={loading} className="w-full">
        {loading ? "Berechne…" : "Ansprüche berechnen"}
        {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
      </Button>
    </Card>
  );
}

// ── Hilfskomponenten ────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ErgebnisAnsicht({
  ergebnis,
  aufgeklappt,
  toggle,
}: {
  ergebnis: AnspruchsErgebnis;
  aufgeklappt: Set<string>;
  toggle: (id: string) => void;
}) {
  const kategorieLabel: Record<string, string> = {
    pflegeversicherung: "Pflegeversicherung (SGB XI)",
    sozialhilfe: "Sozialhilfe / Bürgergeld (SGB XII/II)",
    eingliederungshilfe: "Eingliederungshilfe (SGB IX)",
    jugendhilfe: "Kinder- & Jugendhilfe",
    steuer: "Steuerliche Leistungen",
    rentenversicherung: "Rentenversicherung (SGB VI)",
    unfallversicherung: "Unfallversicherung",
    haushaltshilfe: "Haushaltshilfe",
  };

  const erfuellte = ergebnis.ansprueche.filter((a) => a.voraussetzungen_erfuellt);
  const nichtErfuellt = ergebnis.ansprueche.filter((a) => !a.voraussetzungen_erfuellt);

  return (
    <div className="space-y-6">
      {/* Zusammenfassung */}
      <Card className="p-6 bg-green-50 border-green-200">
        <h2 className="text-lg font-semibold text-green-900 mb-3">
          Ihre möglichen Ansprüche (Stand 2025)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryBox
            wert={`${ergebnis.gesamt_monatlich_eur.toLocaleString("de-DE")} €`}
            label="monatliche Leistungen"
            farbe="green"
          />
          <SummaryBox
            wert={`${ergebnis.gesamt_jaehrlich_eur.toLocaleString("de-DE")} €`}
            label="jährliche Leistungen"
            farbe="green"
          />
          {ergebnis.steuerersparnis_eur > 0 && (
            <SummaryBox
              wert={`${ergebnis.steuerersparnis_eur.toLocaleString("de-DE")} €`}
              label="Steuerersparnis/Jahr"
              farbe="blue"
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Berechnet {new Date(ergebnis.berechnungsdatum).toLocaleDateString("de-DE")} · Deterministisch ·
          Kein KI-Urteil · {erfuellte.length} Ansprüche identifiziert
        </p>
      </Card>

      {/* Erfüllte Ansprüche */}
      {erfuellte.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">✅ {erfuellte.length} Ansprüche identifiziert</h3>
          {erfuellte.map((a) => (
            <AnspruchCard
              key={a.id}
              anspruch={a}
              offen={aufgeklappt.has(a.id)}
              toggle={() => toggle(a.id)}
              kategorieLabel={kategorieLabel}
            />
          ))}
        </div>
      )}

      {/* Nicht erfüllt (kompakt) */}
      {nichtErfuellt.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
            ℹ️ {nichtErfuellt.length} geprüfte Leistungen — Voraussetzungen aktuell nicht erfüllt
          </summary>
          <div className="mt-2 space-y-1 pl-4">
            {nichtErfuellt.map((a) => (
              <div key={a.id} className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="text-gray-300">✗</span>
                {a.titel}
                <span className="text-gray-300">·</span>
                <code className="text-gray-300">{a.rechtsgrundlage}</code>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Nächste Schritte */}
      {ergebnis.naechste_schritte.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">🗂️ Empfohlene nächste Schritte</h3>
          {ergebnis.naechste_schritte.map((s) => (
            <div
              key={s.reihenfolge}
              className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <span className="flex-shrink-0 w-6 h-6 bg-amber-400 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {s.reihenfolge}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{s.titel}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.beschreibung}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.dringlichkeit === "sofort" ? "bg-red-100 text-red-700" :
                    s.dringlichkeit === "diese_woche" ? "bg-orange-100 text-orange-700" :
                    s.dringlichkeit === "diesen_monat" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {s.dringlichkeit === "sofort" ? "⚡ Sofort" :
                     s.dringlichkeit === "diese_woche" ? "Diese Woche" :
                     s.dringlichkeit === "diesen_monat" ? "Diesen Monat" : "Langfristig"}
                  </span>
                  <span className="text-xs text-gray-500">→ {s.zustaendig}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offene Fragen */}
      {ergebnis.offene_fragen.length > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            ℹ️ Für genauere Berechnung:
          </h3>
          <ul className="space-y-1">
            {ergebnis.offene_fragen.map((f, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">›</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Haftungshinweis */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Orientierungshilfe nach SGB XI/XII, BEEG, WoGG, SGB V/VI, EStG § 35a (Stand 2025).
        Kein KI-Urteil — deterministisch regelbasiert (FB-31/FB-125). Ersetzt keine individuelle
        Rechts- oder Steuerberatung. Wenden Sie sich an VdK (0800 1891 0), Pflegestützpunkt oder Caritasverband.
      </p>
    </div>
  );
}

function SummaryBox({
  wert,
  label,
  farbe,
}: {
  wert: string;
  label: string;
  farbe: "green" | "blue";
}) {
  return (
    <div className={`bg-white rounded-lg p-3 border ${farbe === "green" ? "border-green-200" : "border-blue-200"} text-center`}>
      <div className={`text-2xl font-bold ${farbe === "green" ? "text-green-700" : "text-blue-700"}`}>
        {wert}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function AnspruchCard({
  anspruch: a,
  offen,
  toggle,
  kategorieLabel,
}: {
  anspruch: AnspruchsErgebnis["ansprueche"][number];
  offen: boolean;
  toggle: () => void;
  kategorieLabel: Record<string, string>;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={toggle}
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">{a.titel}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {kategorieLabel[a.kategorie] ?? a.kategorie}
              </span>
            </div>
            {a.betrag_monatlich_eur !== undefined && a.betrag_monatlich_eur > 0 && (
              <div className="flex items-center gap-1 mt-1 text-green-700 font-semibold text-sm">
                <Euro className="w-3.5 h-3.5" />
                {a.betrag_monatlich_eur.toLocaleString("de-DE")} €/Monat
              </div>
            )}
            {a.betrag_jaehrlich_eur !== undefined && !a.betrag_monatlich_eur && (
              <div className="flex items-center gap-1 mt-1 text-green-700 font-semibold text-sm">
                <Euro className="w-3.5 h-3.5" />
                {a.betrag_jaehrlich_eur.toLocaleString("de-DE")} €/Jahr
              </div>
            )}
            {a.betrag_einmalig_eur !== undefined && (
              <div className="flex items-center gap-1 mt-1 text-blue-700 font-semibold text-sm">
                <Euro className="w-3.5 h-3.5" />
                bis {a.betrag_einmalig_eur.toLocaleString("de-DE")} € (einmalig)
              </div>
            )}
          </div>
        </div>
        {offen ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {offen && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          <p className="text-sm text-gray-700 pt-3">{a.beschreibung}</p>
          {a.betrag_hinweis && (
            <p className="text-xs text-gray-500 italic">{a.betrag_hinweis}</p>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Rechtsgrundlage
            </p>
            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
              {a.rechtsgrundlage}
            </code>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Voraussetzungen
            </p>
            <ul className="space-y-0.5">
              {a.voraussetzungen_details.map((v, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Antrag bei: </span>
              {a.antrag_bei}
              {a.antrag_hinweis && (
                <p className="mt-1 text-blue-600">{a.antrag_hinweis}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
