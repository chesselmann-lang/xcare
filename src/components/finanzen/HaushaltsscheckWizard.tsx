"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Check, ExternalLink } from "lucide-react";

interface WizardDaten {
  arbeitgeber_name: string;
  arbeitgeber_adresse: string;
  arbeitnehmer_name: string;
  arbeitnehmer_svnr: string;
  stundenlohn: string;
  stunden_pro_woche: string;
  beginn_datum: string;
}

interface HaushaltsscheckEintrag {
  id: string;
  profil_id: string;
  arbeitgeber_name: string;
  arbeitgeber_adresse: string;
  arbeitnehmer_name: string;
  arbeitnehmer_svnr: string;
  stundenlohn: number;
  stunden_pro_woche: number;
  beginn_datum: string;
  aktiv: boolean;
  created_at: string;
}

function formatEur(betrag: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(betrag);
}

const AG_BEITRAGSATZ = 0.1492;

function berechneMonatsbrutto(stundenlohn: number, stundenProWoche: number): number {
  return stundenlohn * stundenProWoche * 4.33;
}

const SCHRITTE = ["Arbeitgeber", "Arbeitnehmer", "Stunden & Lohn", "Zusammenfassung"];

function SchrittIndikator({ aktiv }: { aktiv: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {SCHRITTE.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`flex items-center justify-center rounded-full text-xs font-bold w-7 h-7 flex-shrink-0 ${
              i < aktiv
                ? "bg-[--primary] text-[--primary-foreground]"
                : i === aktiv
                ? "bg-[--primary] text-[--primary-foreground] ring-2 ring-[--primary] ring-offset-2"
                : "bg-[--muted] text-[--muted-foreground]"
            }`}
          >
            {i < aktiv ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={`text-xs hidden sm:block ${
              i === aktiv ? "text-[--foreground] font-medium" : "text-[--muted-foreground]"
            }`}
          >
            {s}
          </span>
          {i < SCHRITTE.length - 1 && (
            <div className={`h-px w-4 flex-shrink-0 mx-1 ${i < aktiv ? "bg-[--primary]" : "bg-[--border]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Feld({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[--foreground]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]"
      />
      {hint && <p className="text-xs text-[--muted-foreground]">{hint}</p>}
    </div>
  );
}

function GespeicherterEintrag({ eintrag }: { eintrag: HaushaltsscheckEintrag }) {
  const monatsbrutto = berechneMonatsbrutto(eintrag.stundenlohn, eintrag.stunden_pro_woche);
  const agBeitrag = monatsbrutto * AG_BEITRAGSATZ;

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium text-[--foreground]">{eintrag.arbeitnehmer_name}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            eintrag.aktiv
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-[--muted] text-[--muted-foreground]"
          }`}
        >
          {eintrag.aktiv ? "Aktiv" : "Inaktiv"}
        </span>
      </div>
      <p className="text-xs text-[--muted-foreground]">Arbeitgeber: {eintrag.arbeitgeber_name}</p>
      <p className="text-xs text-[--muted-foreground]">
        {formatEur(eintrag.stundenlohn)}/Std. x {eintrag.stunden_pro_woche} Std./Woche — Monatsbrutto: {formatEur(monatsbrutto)}
      </p>
      <p className="text-xs text-[--muted-foreground]">
        Geschätzter Arbeitgeberbeitrag Knappschaft: ca. {formatEur(agBeitrag)}/Monat (14,92 %)
      </p>
      <p className="text-xs text-[--muted-foreground]">Beginn: {eintrag.beginn_datum}</p>
    </div>
  );
}

export function HaushaltsscheckWizard() {
  const [schritt, setSchritt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gespeichert, setGespeichert] = useState<HaushaltsscheckEintrag | null>(null);

  const [daten, setDaten] = useState<WizardDaten>({
    arbeitgeber_name: "",
    arbeitgeber_adresse: "",
    arbeitnehmer_name: "",
    arbeitnehmer_svnr: "",
    stundenlohn: "",
    stunden_pro_woche: "",
    beginn_datum: "",
  });

  function set(field: keyof WizardDaten) {
    return (value: string) => setDaten((prev) => ({ ...prev, [field]: value }));
  }

  function weiter() {
    setSchritt((s) => Math.min(s + 1, SCHRITTE.length - 1));
  }

  function zurueck() {
    setSchritt((s) => Math.max(s - 1, 0));
  }

  async function handleSpeichern() {
    setSaving(true);
    try {
      const res = await fetch("/api/haushaltsscheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arbeitgeber_name: daten.arbeitgeber_name,
          arbeitgeber_adresse: daten.arbeitgeber_adresse,
          arbeitnehmer_name: daten.arbeitnehmer_name,
          arbeitnehmer_svnr: daten.arbeitnehmer_svnr,
          stundenlohn: parseFloat(daten.stundenlohn.replace(",", ".")),
          stunden_pro_woche: parseFloat(daten.stunden_pro_woche.replace(",", ".")),
          beginn_datum: daten.beginn_datum,
        }),
      });
      const json = await res.json() as { haushaltsscheck?: HaushaltsscheckEintrag; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Speichern");

      setGespeichert(json.haushaltsscheck ?? null);
      toast.success("Haushaltsscheck-Daten gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  const stundenlohnNum = parseFloat(daten.stundenlohn.replace(",", ".")) || 0;
  const stundenProWocheNum = parseFloat(daten.stunden_pro_woche.replace(",", ".")) || 0;
  const monatsbrutto = berechneMonatsbrutto(stundenlohnNum, stundenProWocheNum);
  const agBeitrag = monatsbrutto * AG_BEITRAGSATZ;
  const jahresbeitrag = agBeitrag * 12;

  if (gespeichert) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[--foreground]">Haushaltsscheck</h2>
          <p className="text-sm text-[--muted-foreground]">Mini-Job in der Hauspflege verwalten</p>
        </div>
        <GespeicherterEintrag eintrag={gespeichert} />
        <button
          onClick={() => {
            setSchritt(0);
            setDaten({
              arbeitgeber_name: "",
              arbeitgeber_adresse: "",
              arbeitnehmer_name: "",
              arbeitnehmer_svnr: "",
              stundenlohn: "",
              stunden_pro_woche: "",
              beginn_datum: "",
            });
            setGespeichert(null);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[--border] text-[--foreground] hover:bg-[--muted] transition-colors"
        >
          Neuen Eintrag anlegen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[--foreground]">Haushaltsscheck</h2>
        <p className="text-sm text-[--muted-foreground]">Mini-Job in der Hauspflege einrichten</p>
      </div>

      <SchrittIndikator aktiv={schritt} />

      {schritt === 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-[--foreground]">Angaben zum Arbeitgeber (Auftraggeber)</h3>
          <Feld label="Name des Arbeitgebers" value={daten.arbeitgeber_name} onChange={set("arbeitgeber_name")} placeholder="z. B. Maria Muster" required />
          <Feld label="Adresse des Arbeitgebers" value={daten.arbeitgeber_adresse} onChange={set("arbeitgeber_adresse")} placeholder="Musterstraße 1, 12345 Musterstadt" required />
        </div>
      )}

      {schritt === 1 && (
        <div className="space-y-4">
          <h3 className="font-medium text-[--foreground]">Angaben zum Arbeitnehmer (Pflegehilfe)</h3>
          <Feld label="Name des Arbeitnehmers" value={daten.arbeitnehmer_name} onChange={set("arbeitnehmer_name")} placeholder="z. B. Anna Schmidt" required />
          <Feld label="Sozialversicherungsnummer" value={daten.arbeitnehmer_svnr} onChange={set("arbeitnehmer_svnr")} placeholder="z. B. 12 123456 A 123" required hint="12-stellige Versicherungsnummer — auf dem Sozialversicherungsausweis" />
        </div>
      )}

      {schritt === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium text-[--foreground]">Vergütung & Arbeitszeit</h3>
          <Feld label="Stundenlohn (€)" value={daten.stundenlohn} onChange={set("stundenlohn")} placeholder="z. B. 13,50" required hint="Mindestlohn 2025: 12,82 EUR/Std." />
          <Feld label="Stunden pro Woche" value={daten.stunden_pro_woche} onChange={set("stunden_pro_woche")} placeholder="z. B. 8" required hint="Mini-Job: max. 538 EUR/Monat — ggf. Stunden anpassen" />
          <Feld label="Beginn des Arbeitsverhältnisses" type="date" value={daten.beginn_datum} onChange={set("beginn_datum")} required />
          {stundenlohnNum > 0 && stundenProWocheNum > 0 && (
            <div className="rounded-lg bg-[--muted] p-3 text-sm space-y-1">
              <p className="font-medium text-[--foreground]">Vorschau Monatsbrutto</p>
              <p className="text-[--muted-foreground]">
                {formatEur(stundenlohnNum)} x {stundenProWocheNum} Std. x 4,33 Wochen ={" "}
                <strong className="text-[--foreground]">{formatEur(monatsbrutto)}</strong>
              </p>
              {monatsbrutto > 538 && (
                <p className="text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                  Achtung: Monatsbrutto überschreitet Mini-Job-Grenze von 538 EUR/Monat
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {schritt === 3 && (
        <div className="space-y-4">
          <h3 className="font-medium text-[--foreground]">Zusammenfassung</h3>

          <div className="rounded-xl border border-[--border] divide-y divide-[--border]">
            {[
              { label: "Arbeitgeber", value: daten.arbeitgeber_name },
              { label: "Adresse", value: daten.arbeitgeber_adresse },
              { label: "Arbeitnehmer", value: daten.arbeitnehmer_name },
              { label: "SV-Nummer", value: daten.arbeitnehmer_svnr },
              { label: "Stundenlohn", value: formatEur(stundenlohnNum) },
              { label: "Stunden/Woche", value: `${stundenProWocheNum} Std.` },
              { label: "Beginn", value: daten.beginn_datum },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-[--muted-foreground]">{label}</span>
                <span className="font-medium text-[--foreground]">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-2">
            <p className="font-medium text-[--foreground]">Geschätzte Knappschaftsbeiträge</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[--muted-foreground]">Monatsbrutto</span>
                <span className="font-medium">{formatEur(monatsbrutto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--muted-foreground]">Arbeitgeberbeitrag (14,92 %)</span>
                <span className="font-medium">{formatEur(agBeitrag)}/Monat</span>
              </div>
              <div className="flex justify-between border-t border-[--border] pt-1 mt-1">
                <span className="text-[--muted-foreground]">Jahresbeitrag</span>
                <span className="font-bold text-[--foreground]">{formatEur(jahresbeitrag)}</span>
              </div>
            </div>
            <p className="text-xs text-[--muted-foreground]">
              Näherungswert — exakte Berechnung erfolgt durch die Knappschaft Minijob-Zentrale.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">Anmeldung erforderlich</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Bitte melden Sie das Arbeitsverhältnis bei der{" "}
              <strong>Knappschaft Minijob-Zentrale</strong> an. Die Anmeldung muss vor Beginn
              der Beschäftigung erfolgen.
            </p>
            <a
              href="https://www.minijob-zentrale.de"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-900 dark:text-amber-200 underline hover:no-underline"
            >
              minijob-zentrale.de
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={zurueck}
          disabled={schritt === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-[--border] text-[--foreground] hover:bg-[--muted] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück
        </button>

        {schritt < SCHRITTE.length - 1 ? (
          <button
            onClick={weiter}
            disabled={
              (schritt === 0 && (!daten.arbeitgeber_name || !daten.arbeitgeber_adresse)) ||
              (schritt === 1 && (!daten.arbeitnehmer_name || !daten.arbeitnehmer_svnr)) ||
              (schritt === 2 && (!daten.stundenlohn || !daten.stunden_pro_woche || !daten.beginn_datum))
            }
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[--primary] text-[--primary-foreground] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSpeichern}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-[--primary] text-[--primary-foreground] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Speichern
          </button>
        )}
      </div>
    </div>
  );
}
