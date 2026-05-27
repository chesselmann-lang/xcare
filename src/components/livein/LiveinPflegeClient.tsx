"use client";

import { useState, useCallback, useTransition } from "react";
import {
  Home,
  Users,
  Euro,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Globe,
  Star,
  AlertCircle,
  Info,
  Clock,
  ArrowRight,
  Shield,
  Heart,
  Car,
  PawPrint,
  X,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AgenturMitScore } from "@/lib/livein/matching";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveinAnfrage {
  id: string;
  status: string;
  created_at: string;
  agentur_id: string | null;
  livein_agenturen?: { name: string } | null;
}

interface Props {
  initialAgenturen: AgenturMitScore[];
  initialAnfragen: LiveinAnfrage[];
}

type ActiveTab = "suche" | "anfragen";

// Multi-step form state
interface AnfrageForm {
  // Step 1: Care needs
  pflegegrad: number;
  demenz_pflege: boolean;
  fuehrerschein_noetig: boolean;
  haustiere_vorhanden: boolean;
  bevorzugtes_geschlecht: string;
  sprache_bevorzugt: string;
  besondere_anforderungen: string;
  // Step 2: Logistics
  unterkunft_beschreibung: string;
  startdatum: string;
  budget_monat: string;
  bundesland: string;
  ort: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PFLEGEGRADE = [1, 2, 3, 4, 5];

const SACHLEISTUNGEN_2026 = [0, 131, 724, 1363, 1693, 2095];

const SPRACHEN = [
  "Polnisch",
  "Rumänisch",
  "Tschechisch",
  "Slowakisch",
  "Ungarisch",
  "Bulgarisch",
];

const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  neu: { label: "Neu", color: "bg-blue-100 text-blue-800" },
  kontaktiert: { label: "Kontaktiert", color: "bg-yellow-100 text-yellow-800" },
  angebot_erhalten: {
    label: "Angebot erhalten",
    color: "bg-purple-100 text-purple-800",
  },
  vereinbart: { label: "Vereinbart", color: "bg-green-100 text-green-800" },
  aktiv: { label: "Aktiv", color: "bg-emerald-100 text-emerald-800" },
  beendet: { label: "Beendet", color: "bg-gray-100 text-gray-600" },
  storniert: { label: "Storniert", color: "bg-red-100 text-red-800" },
};

const ANSTELLUNGSMODELL_LABELS: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "secondary" }
> = {
  "arbeitnehmerüberlassung": {
    label: "AÜG-konform",
    variant: "success",
  },
  entsendung: { label: "Entsendung", variant: "secondary" },
  agentur: { label: "Agentur", variant: "secondary" },
  selbstständig: { label: "Selbstständig", variant: "warning" },
};

function berechneLiveinKosten(pflegegrad: number, monatlichPreis: number) {
  const sachleistung = SACHLEISTUNGEN_2026[pflegegrad] ?? 0;
  const eigenanteil = Math.max(0, monatlichPreis - sachleistung);
  const steuerlichAbsetzbar = Math.min(eigenanteil * 0.2, 333);
  return { sachleistung, eigenanteil, steuerlichAbsetzbar };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500"
      : score >= 60
      ? "bg-blue-500"
      : score >= 40
      ? "bg-amber-500"
      : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-8 text-right">
        {score}%
      </span>
    </div>
  );
}

function AgenturCard({
  agentur,
  onAnfragen,
}: {
  agentur: AgenturMitScore;
  onAnfragen: (id: string) => void;
}) {
  const modell = ANSTELLUNGSMODELL_LABELS[agentur.anstellungsmodell] ?? {
    label: agentur.anstellungsmodell,
    variant: "secondary" as const,
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {agentur.name}
              </h3>
              {agentur.verified && (
                <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">
              {agentur.beschreibung}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-sm font-semibold text-gray-900">
              {agentur.preisrahmen_von?.toLocaleString("de-DE")} –{" "}
              {agentur.preisrahmen_bis?.toLocaleString("de-DE")} €
            </div>
            <div className="text-xs text-gray-400">pro Monat</div>
          </div>
        </div>

        {/* Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Passgenauigkeit</span>
          </div>
          <ScoreBar score={agentur.matching_score} />
        </div>

        {/* Matching reasons */}
        {agentur.matching_gruende.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {agentur.matching_gruende.map((grund) => (
              <span
                key={grund}
                className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5"
              >
                <CheckCircle2 className="h-3 w-3" />
                {grund}
              </span>
            ))}
          </div>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={modell.variant}>{modell.label}</Badge>
          {agentur.herkunftslaender?.map((land) => (
            <Badge key={land} variant="secondary">
              {land}
            </Badge>
          ))}
          {agentur.bewertung_schnitt != null && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(agentur.bewertung_schnitt).toFixed(1)}
              {agentur.anzahl_bewertungen > 0 && (
                <span className="text-gray-400">
                  ({agentur.anzahl_bewertungen})
                </span>
              )}
            </Badge>
          )}
        </div>

        {/* Contact + CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {agentur.kontakt_telefon && (
              <a
                href={`tel:${agentur.kontakt_telefon}`}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {agentur.kontakt_telefon}
              </a>
            )}
            {agentur.kontakt_email && (
              <a
                href={`mailto:${agentur.kontakt_email}`}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {agentur.kontakt_email}
              </a>
            )}
            {agentur.webseite && (
              <a
                href={agentur.webseite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </a>
            )}
          </div>
          <Button size="sm" onClick={() => onAnfragen(agentur.id)}>
            Jetzt anfragen
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KostenRechner() {
  const [pflegegrad, setPflegegrad] = useState(2);
  const [preis, setPreis] = useState(2500);
  const { sachleistung, eigenanteil, steuerlichAbsetzbar } =
    berechneLiveinKosten(pflegegrad, preis);

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Euro className="h-4 w-4 text-blue-600" />
          Kostenrechner
        </CardTitle>
        <CardDescription>
          Schätzung nach § 36 SGB XI (Sachleistungen 2026)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Pflegegrad
            </label>
            <div className="flex gap-1.5">
              {PFLEGEGRADE.map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPflegegrad(pg)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-sm font-semibold border transition-colors",
                    pflegegrad === pg
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  )}
                >
                  {pg}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Monatspreis (€)
            </label>
            <input
              type="number"
              value={preis}
              min={500}
              max={6000}
              step={100}
              onChange={(e) => setPreis(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-0.5">Bruttokosten</div>
            <div className="text-lg font-bold text-gray-900">
              {preis.toLocaleString("de-DE")} €
            </div>
            <div className="text-xs text-gray-400">pro Monat</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <div className="text-xs text-gray-500 mb-0.5">
              Pflegesachleistung (§ 36)
            </div>
            <div className="text-lg font-bold text-green-700">
              − {sachleistung.toLocaleString("de-DE")} €
            </div>
            <div className="text-xs text-gray-400">PG {pflegegrad}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="text-xs text-gray-500 mb-0.5">Ihr Eigenanteil</div>
            <div className="text-lg font-bold text-gray-900">
              {eigenanteil.toLocaleString("de-DE")} €
            </div>
            <div className="text-xs text-gray-400">pro Monat</div>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Steuerlicher Vorteil:</strong> Ca.{" "}
            <strong>{steuerlichAbsetzbar.toFixed(0)} €/Monat</strong> absetzbar
            nach § 35a EStG (haushaltnahe Dienstleistungen, 20% von max.
            20.000 €/Jahr).
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RechtlicheInfobox() {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-600" />
          Rechtliche Grundlagen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-600">
        <div className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800">§ 8 SGB XI</strong> — Erlaubt
            24h-Präsenzpflege, wenn die Pflegekraft im Haushalt der
            pflegebedürftigen Person lebt und dort ihren Lebensmittelpunkt hat.
          </div>
        </div>
        <div className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800">
              AÜG (Arbeitnehmerüberlassungsgesetz)
            </strong>{" "}
            — Die korrekte Form der Vermittlung: Agentur verleiht sozialversicherungspflichtig
            angestellte Pflegekräfte an den Haushalt. Bitte auf AÜG-Lizenz der
            Agentur achten.
          </div>
        </div>
        <div className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800">Entsendung (EU)</strong> —
            Alternativ: Pflegekraft bleibt im Herkunftsland angestellt, wird
            vorübergehend nach Deutschland entsandt (EU-Entsenderichtlinie
            96/71/EG). Mindestlohn nach MiLoG gilt.
          </div>
        </div>
        <div className="flex gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800">Schwarzarbeit vermeiden:</strong>{" "}
            Selbstständige Pflegekräfte aus dem Ausland ohne deutsche
            Gewerbeanmeldung oder Entsendenachweis sind illegal. Alle hier
            gelisteten Agenturen sind verifiziert.
          </div>
        </div>
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-gray-800">Urlaubs- und Ruhezeiten:</strong>{" "}
            Auch bei Live-in-Modellen gilt das ArbZG. Typisch: 6-wöchige
            Einsätze mit anschließender Ablösung durch zweite Pflegekraft
            (Rotationsmodell).
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FaqAccordion() {
  const faqs = [
    {
      frage: "Was ist 24h Live-in Pflege genau?",
      antwort:
        "Eine Pflegekraft zieht in den Haushalt der pflegebedürftigen Person und ist rund um die Uhr anwesend. Anders als Nachtwachen ist sie kein permanent im Einsatz — sie hat Ruhezeiten, steht aber im Notfall sofort zur Verfügung. Das Modell ist nach § 8 SGB XI ausdrücklich erlaubt.",
    },
    {
      frage: "Was kostet 24h Pflege zu Hause?",
      antwort:
        "Die Kosten liegen typischerweise zwischen 1.800 € und 4.000 € pro Monat, abhängig von Pflegegrad, Qualifikation der Pflegekraft und Agentur. Abzüglich Pflegesachleistung (§ 36 SGB XI) und steuerlicher Absetzbarkeit (§ 35a EStG) reduziert sich der Eigenanteil deutlich. Nutzen Sie unseren Kostenrechner oben.",
    },
    {
      frage: "Wie funktioniert das Rotationsmodell?",
      antwort:
        "Um sicherzustellen, dass Pflegekräfte ausreichend Erholung haben, arbeiten üblicherweise zwei Pflegekräfte im Wechsel: ca. 6–8 Wochen im Einsatz, dann Ablösung. Der Übergabeprozess wird von der Agentur koordiniert.",
    },
    {
      frage: "Welchen Unterschied macht das Anstellungsmodell?",
      antwort:
        "Bei der Arbeitnehmerüberlassung (AÜG) ist die Pflegekraft beim deutschen Entleihbetrieb sozialversicherungspflichtig angestellt — das ist arbeitsrechtlich am sichersten. Bei Entsendung bleibt sie im Ausland angestellt, aber der deutsche Mindestlohn und Urlaubsanspruch gelten trotzdem. Selbstständige Modelle ohne Nachweise sind illegal.",
    },
    {
      frage: "Welche Leistungen der Pflegekasse kann ich nutzen?",
      antwort:
        "Pflegesachleistungen (§ 36 SGB XI) können für AÜG-Modelle angerechnet werden. Zusätzlich gibt es den Entlastungsbetrag (125 €/Monat, § 45b SGB XI) sowie ggf. Kombinationsleistungen. Sprechen Sie Ihre Pflegekasse an und fragen Sie nach einem Pflegeberater (§ 7a SGB XI).",
    },
    {
      frage: "Wie schnell kann eine Pflegekraft beginnen?",
      antwort:
        "Seriöse Agenturen nennen eine Reaktionszeit von 3–10 Werktagen für ein erstes Angebot. Der tatsächliche Start hängt von der Verfügbarkeit passender Pflegekräfte und der Visavorbereitung ab — planen Sie 2–4 Wochen Vorlauf.",
    },
    {
      frage: "Was muss ich an Unterkunft bereitstellen?",
      antwort:
        "Die Pflegekraft benötigt ein eigenes Zimmer (mind. 8–10 m²) mit Schließmöglichkeit sowie Zugang zu Bad/WC. Eine separate Küche ist ideal, aber nicht zwingend. Beschreiben Sie Ihre Wohnsituation in der Anfrage so genau wie möglich.",
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Häufige Fragen</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100">
        {faqs.map((faq, idx) => (
          <div key={idx} className="py-3">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full flex items-center justify-between text-left gap-3 group"
            >
              <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                {faq.frage}
              </span>
              {openIdx === idx ? (
                <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </button>
            {openIdx === idx && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {faq.antwort}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Multi-step modal ─────────────────────────────────────────────────────────

function AnfrageModal({
  agenturId,
  agenturen,
  onClose,
  onSuccess,
}: {
  agenturId: string;
  agenturen: AgenturMitScore[];
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const agentur = agenturen.find((a) => a.id === agenturId);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<AnfrageForm>({
    pflegegrad: 2,
    demenz_pflege: false,
    fuehrerschein_noetig: false,
    haustiere_vorhanden: false,
    bevorzugtes_geschlecht: "",
    sprache_bevorzugt: "",
    besondere_anforderungen: "",
    unterkunft_beschreibung: "",
    startdatum: "",
    budget_monat: "",
    bundesland: "",
    ort: "",
  });

  const update = (field: keyof AnfrageForm, value: string | boolean | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/livein", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentur_id: agenturId,
            pflegegrad: form.pflegegrad,
            demenz_pflege: form.demenz_pflege,
            fuehrerschein_noetig: form.fuehrerschein_noetig,
            haustiere_vorhanden: form.haustiere_vorhanden,
            bevorzugtes_geschlecht: form.bevorzugtes_geschlecht || undefined,
            sprache_bevorzugt: form.sprache_bevorzugt || undefined,
            besondere_anforderungen:
              form.besondere_anforderungen || undefined,
            unterkunft_beschreibung:
              form.unterkunft_beschreibung || undefined,
            startdatum: form.startdatum || undefined,
            budget_monat: form.budget_monat
              ? parseInt(form.budget_monat)
              : undefined,
            bundesland: form.bundesland || undefined,
            ort: form.ort || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Unbekannter Fehler");
          return;
        }
        const data = await res.json();
        onSuccess(data.id);
      } catch {
        setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Anfrage stellen
            </h2>
            {agentur && (
              <p className="text-xs text-gray-500">{agentur.name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    s <= step ? "bg-blue-600" : "bg-gray-200"
                  )}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Pflegebedarf */}
          {step === 1 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  Schritt 1: Pflegebedarf
                </h3>
                <p className="text-xs text-gray-500">
                  Damit die Agentur ein passendes Angebot erstellen kann.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">
                  Pflegegrad der pflegebedürftigen Person
                </label>
                <div className="flex gap-2">
                  {PFLEGEGRADE.map((pg) => (
                    <button
                      key={pg}
                      onClick={() => update("pflegegrad", pg)}
                      className={cn(
                        "w-11 h-11 rounded-xl text-sm font-semibold border-2 transition-colors",
                        form.pflegegrad === pg
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      )}
                    >
                      {pg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <ToggleField
                  icon={<Heart className="h-4 w-4" />}
                  label="Demenzerkrankung vorhanden"
                  description="Spezielle Demenzpflege-Erfahrung erforderlich"
                  checked={form.demenz_pflege}
                  onChange={(v) => update("demenz_pflege", v)}
                />
                <ToggleField
                  icon={<Car className="h-4 w-4" />}
                  label="Führerschein erforderlich"
                  description="Pflegekraft muss mobil sein (Arzttermine etc.)"
                  checked={form.fuehrerschein_noetig}
                  onChange={(v) => update("fuehrerschein_noetig", v)}
                />
                <ToggleField
                  icon={<PawPrint className="h-4 w-4" />}
                  label="Haustiere im Haushalt"
                  description="Hund, Katze oder andere Tiere vorhanden"
                  checked={form.haustiere_vorhanden}
                  onChange={(v) => update("haustiere_vorhanden", v)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Bevorzugtes Geschlecht
                  </label>
                  <select
                    value={form.bevorzugtes_geschlecht}
                    onChange={(e) =>
                      update("bevorzugtes_geschlecht", e.target.value)
                    }
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Keine Präferenz</option>
                    <option value="weiblich">Weiblich</option>
                    <option value="männlich">Männlich</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Sprachpräferenz
                  </label>
                  <select
                    value={form.sprache_bevorzugt}
                    onChange={(e) =>
                      update("sprache_bevorzugt", e.target.value)
                    }
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Keine Präferenz</option>
                    {SPRACHEN.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">
                  Besondere Anforderungen (optional)
                </label>
                <textarea
                  value={form.besondere_anforderungen}
                  onChange={(e) =>
                    update("besondere_anforderungen", e.target.value)
                  }
                  placeholder="Diagnosen, Medikamente, Hilfsmittel, Verhaltensbesonderheiten..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Step 2: Logistics */}
          {step === 2 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  Schritt 2: Wohnsituation & Planung
                </h3>
                <p className="text-xs text-gray-500">
                  Damit die Agentur Unterkunft und Kosten einschätzen kann.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">
                  Unterkunft für Pflegekraft
                </label>
                <textarea
                  value={form.unterkunft_beschreibung}
                  onChange={(e) =>
                    update("unterkunft_beschreibung", e.target.value)
                  }
                  placeholder="Eigenes Zimmer vorhanden? Größe, eigenes Bad? Lage im Haus..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Gewünschter Starttermin
                  </label>
                  <input
                    type="date"
                    value={form.startdatum}
                    onChange={(e) => update("startdatum", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Budget (€/Monat)
                  </label>
                  <input
                    type="number"
                    value={form.budget_monat}
                    onChange={(e) => update("budget_monat", e.target.value)}
                    placeholder="z.B. 2500"
                    min={0}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Bundesland
                  </label>
                  <select
                    value={form.bundesland}
                    onChange={(e) => update("bundesland", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Bitte wählen</option>
                    {BUNDESLAENDER.map((bl) => (
                      <option key={bl} value={bl}>
                        {bl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Ort / Stadt
                  </label>
                  <input
                    type="text"
                    value={form.ort}
                    onChange={(e) => update("ort", e.target.value)}
                    placeholder="z.B. München"
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  Schritt 3: Zusammenfassung
                </h3>
                <p className="text-xs text-gray-500">
                  Bitte prüfen Sie Ihre Angaben, bevor Sie die Anfrage senden.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <SummaryRow label="Agentur" value={agentur?.name ?? "—"} />
                <SummaryRow label="Pflegegrad" value={`PG ${form.pflegegrad}`} />
                <SummaryRow
                  label="Demenzpflege"
                  value={form.demenz_pflege ? "Ja" : "Nein"}
                />
                <SummaryRow
                  label="Führerschein nötig"
                  value={form.fuehrerschein_noetig ? "Ja" : "Nein"}
                />
                <SummaryRow
                  label="Haustiere"
                  value={form.haustiere_vorhanden ? "Ja" : "Nein"}
                />
                {form.bevorzugtes_geschlecht && (
                  <SummaryRow
                    label="Geschlecht"
                    value={form.bevorzugtes_geschlecht}
                  />
                )}
                {form.sprache_bevorzugt && (
                  <SummaryRow
                    label="Sprache"
                    value={form.sprache_bevorzugt}
                  />
                )}
                {form.startdatum && (
                  <SummaryRow
                    label="Starttermin"
                    value={new Date(form.startdatum).toLocaleDateString("de-DE")}
                  />
                )}
                {form.budget_monat && (
                  <SummaryRow
                    label="Budget"
                    value={`${parseInt(form.budget_monat).toLocaleString("de-DE")} €/Monat`}
                  />
                )}
                {form.bundesland && (
                  <SummaryRow label="Bundesland" value={form.bundesland} />
                )}
              </div>

              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Die Agentur wird sich innerhalb von{" "}
                  <strong>{agentur?.verfuegbarkeit_tage ?? 7} Werktagen</strong>{" "}
                  bei Ihnen melden. Sie erhalten eine Bestätigung per E-Mail.
                </span>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
            >
              {step === 1 ? "Abbrechen" : "Zurück"}
            </Button>
            {step < 3 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Weiter
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Senden...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Anfrage senden
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleField({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
      <span className="text-gray-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <div
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0",
          checked ? "bg-blue-600" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-4" : "translate-x-1"
          )}
        />
      </div>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LiveinPflegeClient({
  initialAgenturen,
  initialAnfragen,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("suche");
  const [agenturen, setAgenturen] =
    useState<AgenturMitScore[]>(initialAgenturen);
  const [anfragen, setAnfragen] = useState<LiveinAnfrage[]>(initialAnfragen);

  // Filter state
  const [filterPflegegrad, setFilterPflegegrad] = useState<number>(2);
  const [filterBudget, setFilterBudget] = useState<string>("");
  const [filterSprache, setFilterSprache] = useState<string>("");
  const [filterDemenz, setFilterDemenz] = useState(false);
  const [isFiltering, startFilterTransition] = useTransition();

  // Modal state
  const [modalAgenturId, setModalAgenturId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const applyFilters = useCallback(() => {
    startFilterTransition(async () => {
      const params = new URLSearchParams({
        pflegegrad: String(filterPflegegrad),
        demenz: String(filterDemenz),
      });
      if (filterBudget) params.set("budget", filterBudget);
      if (filterSprache) params.set("sprache", filterSprache);

      try {
        const res = await fetch(`/api/livein?${params}`);
        if (res.ok) {
          const data = await res.json();
          setAgenturen(data.agenturen ?? []);
        }
      } catch {
        // keep existing results on network error
      }
    });
  }, [filterPflegegrad, filterBudget, filterSprache, filterDemenz]);

  const handleAnfrageSuccess = (id: string) => {
    setModalAgenturId(null);
    setSuccessId(id);
    setActiveTab("anfragen");
  };

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 rounded-xl p-3">
            <Home className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">
              24h Live-in Pflege zuhause
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed max-w-xl">
              Professionelle Rund-um-die-Uhr-Betreuung im vertrauten Zuhause.
              Alle vermittelten Agenturen beschäftigen Pflegekräfte aus
              Osteuropa sozialversicherungspflichtig und rechtssicher nach{" "}
              <strong>§ 8 SGB XI</strong>.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-blue-100">
                <Shield className="h-3.5 w-3.5" />
                Verifizierte Agenturen
              </div>
              <div className="flex items-center gap-1.5 text-xs text-blue-100">
                <Users className="h-3.5 w-3.5" />
                Polen, Rumänien, Tschechien & mehr
              </div>
              <div className="flex items-center gap-1.5 text-xs text-blue-100">
                <Clock className="h-3.5 w-3.5" />
                Antwort in 3–10 Werktagen
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(
          [
            { key: "suche", label: "Agenturen finden", icon: Users },
            {
              key: "anfragen",
              label: `Meine Anfragen${anfragen.length > 0 ? ` (${anfragen.length})` : ""}`,
              icon: ClipboardList,
            },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Suche */}
      {activeTab === "suche" && (
        <div className="space-y-6">
          {/* Cost calculator */}
          <KostenRechner />

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Pflegegrad
                  </label>
                  <div className="flex gap-1.5">
                    {PFLEGEGRADE.map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setFilterPflegegrad(pg)}
                        className={cn(
                          "w-9 h-9 rounded-lg text-sm font-semibold border transition-colors",
                          filterPflegegrad === pg
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        )}
                      >
                        {pg}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Max. Budget (€/Monat)
                  </label>
                  <input
                    type="number"
                    value={filterBudget}
                    onChange={(e) => setFilterBudget(e.target.value)}
                    placeholder="z.B. 3000"
                    className="h-9 w-32 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    Sprache
                  </label>
                  <select
                    value={filterSprache}
                    onChange={(e) => setFilterSprache(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alle Sprachen</option>
                    {SPRACHEN.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setFilterDemenz((v) => !v)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      filterDemenz ? "bg-blue-600" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
                        filterDemenz ? "translate-x-4" : "translate-x-1"
                      )}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    Demenz-Spezialist
                  </span>
                </label>
                <Button
                  size="sm"
                  onClick={applyFilters}
                  disabled={isFiltering}
                  className="self-end"
                >
                  {isFiltering ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Suche aktualisieren
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                {agenturen.length} Agentur
                {agenturen.length !== 1 ? "en" : ""} gefunden
              </h2>
              <span className="text-xs text-gray-400">
                Sortiert nach Passgenauigkeit
              </span>
            </div>
            <div className="space-y-4">
              {agenturen.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Keine Agenturen gefunden. Bitte passen Sie die Filter an.
                  </p>
                </div>
              ) : (
                agenturen.map((a) => (
                  <AgenturCard
                    key={a.id}
                    agentur={a}
                    onAnfragen={(id) => setModalAgenturId(id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Legal info */}
          <RechtlicheInfobox />

          {/* FAQ */}
          <FaqAccordion />
        </div>
      )}

      {/* Tab: My requests */}
      {activeTab === "anfragen" && (
        <div className="space-y-4">
          {successId && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div>
                <strong>Anfrage erfolgreich gestellt!</strong> Die Agentur wird
                sich in Kürze bei Ihnen melden. Anfrage-ID:{" "}
                <code className="text-xs bg-green-100 px-1.5 py-0.5 rounded">
                  {successId.slice(0, 8)}
                </code>
              </div>
              <button
                onClick={() => setSuccessId(null)}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {anfragen.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm mb-4">
                Sie haben noch keine Anfragen gestellt.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("suche")}
              >
                Agenturen suchen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {anfragen.map((anfrage) => {
                const s =
                  STATUS_LABELS[anfrage.status] ?? STATUS_LABELS["neu"];
                return (
                  <Card key={anfrage.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {(anfrage.livein_agenturen as { name: string } | null)
                              ?.name ?? "Agentur"}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(anfrage.created_at).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0",
                            s.color
                          )}
                        >
                          {s.label}
                        </span>
                      </div>

                      {/* Status timeline */}
                      <div className="mt-3 flex gap-0">
                        {[
                          "neu",
                          "kontaktiert",
                          "angebot_erhalten",
                          "vereinbart",
                          "aktiv",
                        ].map((st, idx, arr) => {
                          const allStatuses = [
                            "neu",
                            "kontaktiert",
                            "angebot_erhalten",
                            "vereinbart",
                            "aktiv",
                            "beendet",
                          ];
                          const currentIdx = allStatuses.indexOf(
                            anfrage.status
                          );
                          const stepIdx = allStatuses.indexOf(st);
                          const done = stepIdx <= currentIdx;
                          return (
                            <div
                              key={st}
                              className="flex items-center flex-1 min-w-0"
                            >
                              <div
                                className={cn(
                                  "w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors",
                                  done
                                    ? "bg-blue-600 border-blue-600"
                                    : "bg-white border-gray-300"
                                )}
                              />
                              {idx < arr.length - 1 && (
                                <div
                                  className={cn(
                                    "h-0.5 flex-1 transition-colors",
                                    done ? "bg-blue-600" : "bg-gray-200"
                                  )}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">Neu</span>
                        <span className="text-xs text-gray-400">Aktiv</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Anfrage modal */}
      {modalAgenturId && (
        <AnfrageModal
          agenturId={modalAgenturId}
          agenturen={agenturen}
          onClose={() => setModalAgenturId(null)}
          onSuccess={handleAnfrageSuccess}
        />
      )}
    </div>
  );
}
