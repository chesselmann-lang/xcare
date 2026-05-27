"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Printer,
  FileText,
  Home,
  Shield,
  Clock,
  Heart,
  Wrench,
  Stethoscope,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type AntragsTyp =
  | "pflegegeld"
  | "pflegesachleistung"
  | "verhinderungspflege"
  | "kurzzeitpflege"
  | "pflegehilfsmittel"
  | "wohnraumanpassung"
  | "tagespflege"
  | "pflegegrad_erstantrag";

interface Prefill {
  antragsteller_vorname: string;
  antragsteller_nachname: string;
  antragsteller_email: string;
  antragsteller_telefon: string;
  antragsteller_plz: string;
  antragsteller_ort: string;
  datum: string;
}

interface FormData extends Prefill {
  antragsteller_strasse: string;
  antragsteller_geburtsdatum: string;
  antragsteller_versicherungsnummer: string;
  pflegebeduerftige_name: string;
  pflegebeduerftige_geburtsdatum: string;
  pflegebeduerftige_pflegegrad: string;
  pflegekasse_name: string;
  pflegekasse_adresse: string;
  pflegekasse_ik: string;
  leistungsbeginn: string;
  begruendung: string;
}

interface AntragsAssistentClientProps {
  prefill: Prefill;
}

// ────────────────────────────────────────────────────────────
// Static data
// ────────────────────────────────────────────────────────────

const ANTRAGSTYPEN: {
  typ: AntragsTyp;
  name: string;
  paragraf: string;
  beschreibung: string;
  Icon: React.ElementType;
}[] = [
  {
    typ: "pflegegeld",
    name: "Pflegegeld",
    paragraf: "§ 37 SGB XI",
    beschreibung:
      "Geldleistung für selbst organisierte Pflege durch Angehörige oder private Pflegepersonen.",
    Icon: Heart,
  },
  {
    typ: "pflegesachleistung",
    name: "Pflegesachleistung",
    paragraf: "§ 36 SGB XI",
    beschreibung:
      "Übernahme der Kosten für ambulante Pflegedienste bis zum festgelegten Höchstbetrag.",
    Icon: Shield,
  },
  {
    typ: "verhinderungspflege",
    name: "Verhinderungspflege",
    paragraf: "§ 39 SGB XI",
    beschreibung:
      "Ersatzpflege bei Urlaub oder Verhinderung der Hauptpflegeperson (bis 1.612 €/Jahr).",
    Icon: Clock,
  },
  {
    typ: "kurzzeitpflege",
    name: "Kurzzeitpflege",
    paragraf: "§ 42 SGB XI",
    beschreibung:
      "Stationäre Pflege für bis zu 8 Wochen im Jahr bei vorübergehendem Bedarf.",
    Icon: Home,
  },
  {
    typ: "pflegehilfsmittel",
    name: "Pflegehilfsmittel",
    paragraf: "§ 40 SGB XI",
    beschreibung:
      "Technische Hilfsmittel und zum Verbrauch bestimmte Pflegehilfsmittel (bis 40 €/Monat).",
    Icon: Wrench,
  },
  {
    typ: "tagespflege",
    name: "Tagespflege",
    paragraf: "§ 41 SGB XI",
    beschreibung:
      "Teilstationäre Betreuung in einer Tagespflegeeinrichtung tagsüber.",
    Icon: Sun,
  },
  {
    typ: "wohnraumanpassung",
    name: "Wohnraumanpassung",
    paragraf: "§ 40 Abs. 4 SGB XI",
    beschreibung:
      "Zuschuss für Umbaumaßnahmen zur Verbesserung des Wohnumfelds (bis 4.000 €).",
    Icon: Home,
  },
  {
    typ: "pflegegrad_erstantrag",
    name: "Pflegegrad-Erstantrag",
    paragraf: "§ 14–15 SGB XI",
    beschreibung:
      "Antrag auf Begutachtung durch den MDK zur Feststellung des Pflegegrades.",
    Icon: Stethoscope,
  },
];

const BEGRUENDUNG_TEMPLATE: Record<AntragsTyp, string> = {
  pflegegeld:
    "Die pflegebedürftige Person ist aufgrund ihrer gesundheitlichen Einschränkungen auf tägliche Pflege und Unterstützung angewiesen. Die Pflege wird durch Angehörige sichergestellt. Wir beantragen hiermit die Gewährung von Pflegegeld gemäß § 37 SGB XI.",
  pflegesachleistung:
    "Aufgrund des bestehenden Pflegebedarfs ist die Inanspruchnahme eines zugelassenen ambulanten Pflegedienstes erforderlich. Die Pflegeleistungen umfassen Körperpflege, Ernährung und Mobilität. Wir beantragen die Übernahme der Kosten gemäß § 36 SGB XI.",
  verhinderungspflege:
    "Die regelmäßig pflegende Person ist vorübergehend verhindert und kann die Pflege nicht übernehmen. Es wird Ersatzpflege benötigt. Wir beantragen die Übernahme der Kosten für Verhinderungspflege gemäß § 39 SGB XI.",
  kurzzeitpflege:
    "Eine vorübergehende stationäre Unterbringung in einer Kurzzeitpflegeeinrichtung ist medizinisch und pflegerisch notwendig. Wir beantragen die Übernahme der Kosten gemäß § 42 SGB XI.",
  pflegehilfsmittel:
    "Zur Erleichterung der Pflege und zur Linderung der Beschwerden der pflegebedürftigen Person werden Pflegehilfsmittel benötigt. Wir beantragen die Genehmigung und Kostenübernahme gemäß § 40 SGB XI.",
  tagespflege:
    "Die teilstationäre Betreuung in einer Tagespflegeeinrichtung ist zur Entlastung der Pflegepersonen und zur Förderung der pflegebedürftigen Person erforderlich. Wir beantragen die Kostenübernahme gemäß § 41 SGB XI.",
  wohnraumanpassung:
    "Um die häusliche Pflege zu ermöglichen und zu erleichtern, sind Umbaumaßnahmen im Wohnraum der pflegebedürftigen Person notwendig. Wir beantragen einen Zuschuss gemäß § 40 Abs. 4 SGB XI.",
  pflegegrad_erstantrag:
    "Wir beantragen die Begutachtung der pflegebedürftigen Person durch den Medizinischen Dienst (MD) zur Feststellung des Pflegegrades gemäß §§ 14, 15 SGB XI. Die Person ist aufgrund von Erkrankungen und Beeinträchtigungen auf Pflege und Unterstützung angewiesen.",
};

const STEPS = ["Antragstyp", "Formulardaten", "Vorschau", "PDF-Export"];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function AntragsAssistentClient({
  prefill,
}: AntragsAssistentClientProps) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [selectedTyp, setSelectedTyp] = useState<AntragsTyp | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    ...prefill,
    antragsteller_strasse: "",
    antragsteller_geburtsdatum: "",
    antragsteller_versicherungsnummer: "",
    pflegebeduerftige_name: "",
    pflegebeduerftige_geburtsdatum: "",
    pflegebeduerftige_pflegegrad: "",
    pflegekasse_name: "",
    pflegekasse_adresse: "",
    pflegekasse_ik: "",
    leistungsbeginn: "",
    begruendung: "",
  });

  // ── Helpers ──────────────────────────────────────────────

  function updateField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypSelect(typ: AntragsTyp) {
    setSelectedTyp(typ);
    setForm((prev) => ({
      ...prev,
      begruendung: BEGRUENDUNG_TEMPLATE[typ],
    }));
  }

  async function handleSave() {
    if (!selectedTyp) return;
    setSaving(true);
    try {
      const res = await fetch("/api/antraege", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ: selectedTyp, formulardaten: form }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedId(data.id);
        setStep(3);
      }
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // ── Step content ─────────────────────────────────────────

  const typInfo = ANTRAGSTYPEN.find((t) => t.typ === selectedTyp);

  // ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#antrag-print-area) { display: none !important; }
          #antrag-print-area { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print">
        <h1 className="text-2xl font-bold text-[--foreground]">
          1-Click Antragstellung
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Pflegeleistungen beantragen — automatisch vorbefüllt, fertig zum
          Ausdrucken.
        </p>
      </div>

      {/* Step tracker */}
      <div className="no-print flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                  i < step
                    ? "bg-[--primary] border-[--primary] text-white"
                    : i === step
                      ? "border-[--primary] text-[--primary]"
                      : "border-[--border] text-[--muted-foreground]"
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:block",
                  i === step
                    ? "font-semibold text-[--foreground]"
                    : "text-[--muted-foreground]"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-12 mx-2 transition-colors",
                  i < step ? "bg-[--primary]" : "bg-[--border]"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 0: Typ wählen ─────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-[--muted-foreground]">
            Wählen Sie die Art der Leistung, die Sie beantragen möchten.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ANTRAGSTYPEN.map(({ typ, name, paragraf, beschreibung, Icon }) => (
              <button
                key={typ}
                onClick={() => handleTypSelect(typ)}
                className={cn(
                  "text-left rounded-xl border-2 p-4 transition-all hover:border-[--primary]/60 hover:shadow-sm",
                  selectedTyp === typ
                    ? "border-[--primary] bg-[--primary]/5 shadow-sm"
                    : "border-[--border] bg-[--card]"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "rounded-lg p-2 mt-0.5",
                      selectedTyp === typ
                        ? "bg-[--primary] text-white"
                        : "bg-[--muted] text-[--muted-foreground]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[--foreground]">
                        {name}
                      </span>
                      <span className="text-xs text-[--muted-foreground]">
                        {paragraf}
                      </span>
                    </div>
                    <p className="text-xs text-[--muted-foreground] mt-1 leading-relaxed">
                      {beschreibung}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep(1)}
              disabled={!selectedTyp}
              className="gap-2"
            >
              Weiter <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Formulardaten ──────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            {typInfo && (
              <Badge variant="secondary">
                {typInfo.name} · {typInfo.paragraf}
              </Badge>
            )}
          </div>

          {/* Antragsteller */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Antragsteller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Vorname"
                  value={form.antragsteller_vorname}
                  onChange={(v) => updateField("antragsteller_vorname", v)}
                />
                <Field
                  label="Nachname"
                  value={form.antragsteller_nachname}
                  onChange={(v) => updateField("antragsteller_nachname", v)}
                />
              </div>
              <Field
                label="Straße und Hausnummer"
                value={form.antragsteller_strasse}
                onChange={(v) => updateField("antragsteller_strasse", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="PLZ"
                  value={form.antragsteller_plz}
                  onChange={(v) => updateField("antragsteller_plz", v)}
                />
                <Field
                  label="Ort"
                  value={form.antragsteller_ort}
                  onChange={(v) => updateField("antragsteller_ort", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="E-Mail"
                  value={form.antragsteller_email}
                  onChange={(v) => updateField("antragsteller_email", v)}
                  type="email"
                />
                <Field
                  label="Telefon"
                  value={form.antragsteller_telefon}
                  onChange={(v) => updateField("antragsteller_telefon", v)}
                  type="tel"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Geburtsdatum"
                  value={form.antragsteller_geburtsdatum}
                  onChange={(v) =>
                    updateField("antragsteller_geburtsdatum", v)
                  }
                  type="date"
                />
                <Field
                  label="Krankenversicherungsnummer"
                  value={form.antragsteller_versicherungsnummer}
                  onChange={(v) =>
                    updateField("antragsteller_versicherungsnummer", v)
                  }
                  placeholder="A123456789"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pflegebedürftige Person */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Pflegebedürftige Person
                <span className="font-normal text-sm text-[--muted-foreground] ml-2">
                  (falls abweichend)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Name der pflegebedürftigen Person"
                value={form.pflegebeduerftige_name}
                onChange={(v) => updateField("pflegebeduerftige_name", v)}
                placeholder="Leer lassen, falls identisch mit Antragsteller"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Geburtsdatum"
                  value={form.pflegebeduerftige_geburtsdatum}
                  onChange={(v) =>
                    updateField("pflegebeduerftige_geburtsdatum", v)
                  }
                  type="date"
                />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wide">
                    Pflegegrad
                  </label>
                  <select
                    value={form.pflegebeduerftige_pflegegrad}
                    onChange={(e) =>
                      updateField("pflegebeduerftige_pflegegrad", e.target.value)
                    }
                    className="w-full h-10 rounded-lg border border-[--border] bg-[--background] px-3 text-sm text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring]"
                  >
                    <option value="">Kein / Noch nicht beantragt</option>
                    <option value="1">Pflegegrad 1</option>
                    <option value="2">Pflegegrad 2</option>
                    <option value="3">Pflegegrad 3</option>
                    <option value="4">Pflegegrad 4</option>
                    <option value="5">Pflegegrad 5</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pflegekasse */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pflegekasse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Name der Pflegekasse"
                value={form.pflegekasse_name}
                onChange={(v) => updateField("pflegekasse_name", v)}
                placeholder="z.B. AOK Bayern – Die Gesundheitskasse"
              />
              <Field
                label="Adresse der Pflegekasse"
                value={form.pflegekasse_adresse}
                onChange={(v) => updateField("pflegekasse_adresse", v)}
                placeholder="Straße, PLZ Ort"
              />
              <Field
                label="IK-Nummer (optional)"
                value={form.pflegekasse_ik}
                onChange={(v) => updateField("pflegekasse_ik", v)}
                placeholder="Institutionskennzeichen"
              />
            </CardContent>
          </Card>

          {/* Leistungsbeginn & Begründung */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Antrag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Gewünschter Leistungsbeginn"
                value={form.leistungsbeginn}
                onChange={(v) => updateField("leistungsbeginn", v)}
                type="date"
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wide">
                  Begründung
                </label>
                <textarea
                  value={form.begruendung}
                  onChange={(e) => updateField("begruendung", e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] resize-y"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4" /> Zurück
            </Button>
            <Button onClick={() => setStep(2)}>
              Vorschau <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Vorschau ───────────────────────────────── */}
      {step === 2 && typInfo && (
        <div className="space-y-4">
          {/* Letter preview */}
          <div
            id="antrag-print-area"
            ref={printRef}
            className="bg-white border border-[--border] rounded-xl p-8 shadow-sm text-[--foreground] font-serif text-sm leading-relaxed"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {/* Sender */}
            <div className="mb-8">
              <p className="font-bold not-italic" style={{ fontFamily: "sans-serif" }}>
                {form.antragsteller_vorname} {form.antragsteller_nachname}
              </p>
              {form.antragsteller_strasse && (
                <p style={{ fontFamily: "sans-serif" }}>{form.antragsteller_strasse}</p>
              )}
              {(form.antragsteller_plz || form.antragsteller_ort) && (
                <p style={{ fontFamily: "sans-serif" }}>
                  {form.antragsteller_plz} {form.antragsteller_ort}
                </p>
              )}
              {form.antragsteller_telefon && (
                <p style={{ fontFamily: "sans-serif" }}>Tel.: {form.antragsteller_telefon}</p>
              )}
              {form.antragsteller_email && (
                <p style={{ fontFamily: "sans-serif" }}>{form.antragsteller_email}</p>
              )}
              {form.antragsteller_versicherungsnummer && (
                <p style={{ fontFamily: "sans-serif" }}>
                  Vers.-Nr.: {form.antragsteller_versicherungsnummer}
                </p>
              )}
            </div>

            {/* Recipient */}
            {form.pflegekasse_name && (
              <div className="mb-8">
                <p className="font-bold" style={{ fontFamily: "sans-serif" }}>
                  {form.pflegekasse_name}
                </p>
                {form.pflegekasse_adresse && (
                  <p style={{ fontFamily: "sans-serif" }}>{form.pflegekasse_adresse}</p>
                )}
                {form.pflegekasse_ik && (
                  <p style={{ fontFamily: "sans-serif" }}>IK: {form.pflegekasse_ik}</p>
                )}
              </div>
            )}

            {/* Date */}
            <div className="text-right mb-6" style={{ fontFamily: "sans-serif" }}>
              {form.antragsteller_ort
                ? `${form.antragsteller_ort}, ${form.datum}`
                : form.datum}
            </div>

            {/* Subject */}
            <p className="font-bold underline mb-6" style={{ fontFamily: "sans-serif" }}>
              Antrag auf {typInfo.name} gemäß {typInfo.paragraf}
            </p>

            {/* Salutation */}
            <p className="mb-4" style={{ fontFamily: "sans-serif" }}>
              Sehr geehrte Damen und Herren,
            </p>

            {/* Pflegebedürftige */}
            {form.pflegebeduerftige_name && (
              <p className="mb-4" style={{ fontFamily: "sans-serif" }}>
                hiermit stelle ich Antrag auf {typInfo.name} für{" "}
                <strong>{form.pflegebeduerftige_name}</strong>
                {form.pflegebeduerftige_geburtsdatum
                  ? `, geboren am ${new Date(form.pflegebeduerftige_geburtsdatum).toLocaleDateString("de-DE")}`
                  : ""}
                {form.pflegebeduerftige_pflegegrad
                  ? `, Pflegegrad ${form.pflegebeduerftige_pflegegrad}`
                  : ""}
                .
              </p>
            )}

            {/* Main body */}
            <p className="mb-6 whitespace-pre-wrap" style={{ fontFamily: "sans-serif" }}>
              {form.begruendung}
            </p>

            {/* Leistungsbeginn */}
            {form.leistungsbeginn && (
              <p className="mb-4" style={{ fontFamily: "sans-serif" }}>
                Ich beantrage die Leistungen ab dem{" "}
                <strong>
                  {new Date(form.leistungsbeginn).toLocaleDateString("de-DE")}
                </strong>
                .
              </p>
            )}

            {/* Closing */}
            <p className="mb-8" style={{ fontFamily: "sans-serif" }}>
              Ich bitte um Bestätigung des Eingangs meines Antrags und um
              baldige Bearbeitung.
            </p>

            <p className="mb-12" style={{ fontFamily: "sans-serif" }}>
              Mit freundlichen Grüßen,
            </p>

            <p className="border-t border-gray-400 pt-1 w-48" style={{ fontFamily: "sans-serif" }}>
              {form.antragsteller_vorname} {form.antragsteller_nachname}
            </p>
          </div>

          <div className="flex justify-between pt-2 no-print">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" /> Bearbeiten
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Wird gespeichert…" : "Speichern & weiter"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PDF Export ─────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="rounded-full bg-green-100 p-2">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  Antrag gespeichert
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Ihr Antrag wurde als Entwurf gespeichert. Drucken Sie ihn
                  aus und senden Sie ihn an Ihre Pflegekasse.
                </p>
                {savedId && (
                  <p className="text-xs text-green-600 mt-1 font-mono">
                    ID: {savedId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-[--primary]" />
                  <p className="font-semibold">Antrag drucken / als PDF</p>
                </div>
                <p className="text-sm text-[--muted-foreground]">
                  Klicken Sie auf „Drucken" und wählen Sie im Druckdialog
                  „Als PDF speichern", um eine digitale Kopie zu erstellen.
                </p>
                <Button onClick={handlePrint} className="w-full">
                  <Printer className="h-4 w-4" />
                  Drucken / Als PDF speichern
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[--muted-foreground]" />
                  <p className="font-semibold">Alle Anträge</p>
                </div>
                <p className="text-sm text-[--muted-foreground]">
                  Verwalten Sie alle Ihre Anträge, ergänzen Sie Aktenzeichen
                  und verfolgen Sie den Status.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/familie/antraege")}
                >
                  Zur Antragsübersicht
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Re-show print preview for print */}
          {typInfo && (
            <div
              id="antrag-print-area"
              className="hidden print:block bg-white p-8 text-sm leading-relaxed"
              style={{ fontFamily: "Georgia, serif" }}
            >
              <div className="mb-8">
                <p className="font-bold">
                  {form.antragsteller_vorname} {form.antragsteller_nachname}
                </p>
                {form.antragsteller_strasse && <p>{form.antragsteller_strasse}</p>}
                {(form.antragsteller_plz || form.antragsteller_ort) && (
                  <p>
                    {form.antragsteller_plz} {form.antragsteller_ort}
                  </p>
                )}
                {form.antragsteller_telefon && (
                  <p>Tel.: {form.antragsteller_telefon}</p>
                )}
                {form.antragsteller_email && <p>{form.antragsteller_email}</p>}
                {form.antragsteller_versicherungsnummer && (
                  <p>Vers.-Nr.: {form.antragsteller_versicherungsnummer}</p>
                )}
              </div>

              {form.pflegekasse_name && (
                <div className="mb-8">
                  <p className="font-bold">{form.pflegekasse_name}</p>
                  {form.pflegekasse_adresse && <p>{form.pflegekasse_adresse}</p>}
                  {form.pflegekasse_ik && <p>IK: {form.pflegekasse_ik}</p>}
                </div>
              )}

              <div className="text-right mb-6">
                {form.antragsteller_ort
                  ? `${form.antragsteller_ort}, ${form.datum}`
                  : form.datum}
              </div>

              <p className="font-bold underline mb-6">
                Antrag auf {typInfo.name} gemäß {typInfo.paragraf}
              </p>

              <p className="mb-4">Sehr geehrte Damen und Herren,</p>

              {form.pflegebeduerftige_name && (
                <p className="mb-4">
                  hiermit stelle ich Antrag auf {typInfo.name} für{" "}
                  <strong>{form.pflegebeduerftige_name}</strong>
                  {form.pflegebeduerftige_geburtsdatum
                    ? `, geboren am ${new Date(form.pflegebeduerftige_geburtsdatum).toLocaleDateString("de-DE")}`
                    : ""}
                  {form.pflegebeduerftige_pflegegrad
                    ? `, Pflegegrad ${form.pflegebeduerftige_pflegegrad}`
                    : ""}
                  .
                </p>
              )}

              <p className="mb-6 whitespace-pre-wrap">{form.begruendung}</p>

              {form.leistungsbeginn && (
                <p className="mb-4">
                  Ich beantrage die Leistungen ab dem{" "}
                  <strong>
                    {new Date(form.leistungsbeginn).toLocaleDateString("de-DE")}
                  </strong>
                  .
                </p>
              )}

              <p className="mb-8">
                Ich bitte um Bestätigung des Eingangs meines Antrags und um
                baldige Bearbeitung.
              </p>

              <p className="mb-12">Mit freundlichen Grüßen,</p>

              <p className="border-t border-gray-400 pt-1 w-48">
                {form.antragsteller_vorname} {form.antragsteller_nachname}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Small reusable Field component
// ────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-lg border border-[--border] bg-[--background] px-3 text-sm text-[--foreground] placeholder:text-[--muted-foreground]/50 focus:outline-none focus:ring-2 focus:ring-[--ring]"
      />
    </div>
  );
}
