"use client";

import { useState, useCallback, useTransition } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  Award,
  Clock,
  Euro,
  MapPin,
  Monitor,
  Users,
  CheckCircle2,
  Star,
  StarHalf,
  ChevronDown,
  ChevronUp,
  BookOpen,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  Download,
  Calendar,
  Info,
  Loader2,
  ArrowLeft,
  Tag,
  TrendingUp,
  Wifi,
  Building2,
  Heart,
  ShieldCheck,
  Stethoscope,
  Zap,
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type KursAnbieter = {
  id: string;
  name: string;
  zertifizierungen: string[] | null;
  logo_url: string | null;
};

type Termin = {
  datum: string;
  ort: string;
  freie_plaetze: number;
};

type Kurs = {
  id: string;
  titel: string;
  beschreibung: string;
  kategorie: KursKategorie;
  niveau: KursNiveau;
  format: KursFormat;
  dauer_stunden: number;
  preis_regulaer: number;
  preis_foerderung: number | null;
  foerderung_moeglich: boolean;
  foerderung_info: string | null;
  zertifikat_erhalten: boolean;
  zertifikat_name: string | null;
  lernziele: string[] | null;
  naechste_termine: Termin[] | null;
  bewertung_schnitt: number;
  anzahl_bewertungen: number;
  bundesland: string | null;
  ort: string | null;
  kurs_anbieter: KursAnbieter | null;
};

type Buchung = {
  id: string;
  status: BuchungStatus;
  termin_datum: string | null;
  kurs_id: string;
  zertifikat_ausgestellt: boolean;
  erstellt_am?: string;
  kurse: { titel: string; kategorie: string } | null;
};

type KursKategorie =
  | "grundpflege"
  | "behandlungspflege"
  | "palliativpflege"
  | "demenzpflege"
  | "wundversorgung"
  | "beatmung"
  | "hygiene"
  | "recht_dokumentation"
  | "fuehrung_management"
  | "erste_hilfe"
  | "digitalisierung"
  | "sonstiges";

type KursFormat = "praesenz" | "online" | "hybrid" | "e_learning";
type KursNiveau = "grundkurs" | "aufbaukurs" | "fortgeschritten" | "experte" | "zertifikat";
type BuchungStatus = "angemeldet" | "bestaetigt" | "bezahlt" | "abgeschlossen" | "storniert";
type ActiveTab = "kurse" | "meine";

// ─── Constants ────────────────────────────────────────────────────────────────

const KATEGORIEN: { value: KursKategorie | "alle"; label: string; icon: typeof Heart }[] = [
  { value: "alle", label: "Alle Kurse", icon: BookOpen },
  { value: "grundpflege", label: "Grundpflege", icon: Heart },
  { value: "behandlungspflege", label: "Behandlungspflege", icon: Stethoscope },
  { value: "palliativpflege", label: "Palliativpflege", icon: Heart },
  { value: "demenzpflege", label: "Demenzpflege", icon: Users },
  { value: "wundversorgung", label: "Wundversorgung", icon: ShieldCheck },
  { value: "beatmung", label: "Beatmung", icon: Zap },
  { value: "hygiene", label: "Hygiene", icon: ShieldCheck },
  { value: "recht_dokumentation", label: "Recht & Dokumentation", icon: FileText },
  { value: "fuehrung_management", label: "Führung & Management", icon: Briefcase },
  { value: "erste_hilfe", label: "Erste Hilfe", icon: TrendingUp },
  { value: "digitalisierung", label: "Digitalisierung", icon: Monitor },
  { value: "sonstiges", label: "Sonstiges", icon: Tag },
];

const FORMATE: { value: KursFormat | "alle"; label: string; icon: typeof Monitor }[] = [
  { value: "alle", label: "Alle Formate", icon: BookOpen },
  { value: "praesenz", label: "Präsenz", icon: Building2 },
  { value: "online", label: "Online", icon: Wifi },
  { value: "hybrid", label: "Hybrid", icon: Monitor },
  { value: "e_learning", label: "E-Learning", icon: GraduationCap },
];

const NIVEAU_LABELS: Record<KursNiveau, string> = {
  grundkurs: "Grundkurs",
  aufbaukurs: "Aufbaukurs",
  fortgeschritten: "Fortgeschritten",
  experte: "Experte",
  zertifikat: "Zertifikat",
};

const NIVEAU_COLORS: Record<KursNiveau, string> = {
  grundkurs: "bg-blue-100 text-blue-700",
  aufbaukurs: "bg-purple-100 text-purple-700",
  fortgeschritten: "bg-orange-100 text-orange-700",
  experte: "bg-red-100 text-red-700",
  zertifikat: "bg-emerald-100 text-emerald-700",
};

const FORMAT_LABELS: Record<KursFormat, string> = {
  praesenz: "Präsenz",
  online: "Online",
  hybrid: "Hybrid",
  e_learning: "E-Learning",
};

const FORMAT_COLORS: Record<KursFormat, string> = {
  praesenz: "bg-amber-100 text-amber-700",
  online: "bg-sky-100 text-sky-700",
  hybrid: "bg-violet-100 text-violet-700",
  e_learning: "bg-teal-100 text-teal-700",
};

const STATUS_LABELS: Record<BuchungStatus, string> = {
  angemeldet: "Angemeldet",
  bestaetigt: "Bestätigt",
  bezahlt: "Bezahlt",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

const STATUS_COLORS: Record<BuchungStatus, string> = {
  angemeldet: "bg-blue-100 text-blue-700",
  bestaetigt: "bg-green-100 text-green-700",
  bezahlt: "bg-emerald-100 text-emerald-700",
  abgeschlossen: "bg-gray-100 text-gray-700",
  storniert: "bg-red-100 text-red-700",
};

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatPreis(preis: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(preis);
}

function formatDatum(datum: string): string {
  return new Date(datum + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDatumLang(datum: string): string {
  return new Date(datum + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} von 5 Sternen`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />;
        if (i === full && half)
          return <StarHalf key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />;
        return <Star key={i} className="w-3.5 h-3.5 text-gray-300" />;
      })}
      {rating > 0 ? (
        <span className="ml-1 text-xs text-gray-500">
          {rating.toFixed(1)} ({count})
        </span>
      ) : (
        <span className="ml-1 text-xs text-gray-400">Neu</span>
      )}
    </span>
  );
}

// ─── Cert Badge ───────────────────────────────────────────────────────────────

function CertBadge({ cert }: { cert: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
      <BadgeCheck className="w-3 h-3" />
      {cert}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

// ─── Termin Badge ─────────────────────────────────────────────────────────────

function TerminBadge({ termin }: { termin: Termin }) {
  const plaetze = termin.freie_plaetze;
  const color =
    plaetze === 0
      ? "bg-red-50 text-red-700 ring-red-200"
      : plaetze <= 5
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-green-50 text-green-700 ring-green-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 ${color}`}>
      <Calendar className="w-3 h-3" />
      {formatDatum(termin.datum)} · {termin.ort}
      {plaetze === 0 ? (
        <span className="font-semibold">· Ausgebucht</span>
      ) : (
        <span>· {plaetze} Plätze frei</span>
      )}
    </span>
  );
}

// ─── Kurs Card ────────────────────────────────────────────────────────────────

function KursCard({
  kurs,
  isBucht,
  onDetails,
  onBuchen,
  buchungLoading,
}: {
  kurs: Kurs;
  isBucht: boolean;
  onDetails: (kurs: Kurs) => void;
  onBuchen: (kurs: Kurs) => void;
  buchungLoading: string | null;
}) {
  const termine = kurs.naechste_termine ?? [];
  const naechsterTermin = termine[0] ?? null;
  const isLoading = buchungLoading === kurs.id;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Top band */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-gray-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
              onClick={() => onDetails(kurs)}
            >
              {kurs.titel}
            </h3>
            {kurs.kurs_anbieter && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {kurs.kurs_anbieter.name}
              </p>
            )}
          </div>
          {kurs.zertifikat_erhalten && (
            <Award className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" title="Zertifikat inklusive" />
          )}
        </div>

        {/* Provider cert badges */}
        {kurs.kurs_anbieter?.zertifizierungen && kurs.kurs_anbieter.zertifizierungen.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {kurs.kurs_anbieter.zertifizierungen.map((cert) => (
              <CertBadge key={cert} cert={cert} />
            ))}
          </div>
        )}

        {/* Category + level + format badges */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NIVEAU_COLORS[kurs.niveau]}`}
          >
            {NIVEAU_LABELS[kurs.niveau]}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FORMAT_COLORS[kurs.format]}`}
          >
            {FORMAT_LABELS[kurs.format]}
          </span>
          {kurs.foerderung_moeglich && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3" />
              Förderung möglich
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{kurs.beschreibung}</p>

        {/* Meta: duration, rating */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {kurs.dauer_stunden}h
            </span>
            {kurs.ort && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {kurs.ort}
              </span>
            )}
          </div>
          <StarRating rating={kurs.bewertung_schnitt} count={kurs.anzahl_bewertungen} />
        </div>

        {/* Next date */}
        {naechsterTermin && (
          <TerminBadge termin={naechsterTermin} />
        )}

        {/* Cert name */}
        {kurs.zertifikat_name && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
            <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium">{kurs.zertifikat_name}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + actions */}
        <div className="flex items-end justify-between gap-2 pt-2 border-t border-gray-100">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900">
                {formatPreis(kurs.preis_regulaer)}
              </span>
              {kurs.preis_foerderung && (
                <span className="text-sm text-green-600 font-medium">
                  → {formatPreis(kurs.preis_foerderung)} mit Förderung
                </span>
              )}
            </div>
            {kurs.foerderung_info && (
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{kurs.foerderung_info}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onDetails(kurs)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Details
            </button>
            {isBucht ? (
              <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Angemeldet
              </span>
            ) : (
              <button
                onClick={() => onBuchen(kurs)}
                disabled={isLoading}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                Jetzt anmelden
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function KursDetailModal({
  kurs,
  isBucht,
  onClose,
  onBuchen,
  buchungLoading,
}: {
  kurs: Kurs;
  isBucht: boolean;
  onClose: () => void;
  onBuchen: (kurs: Kurs, terminDatum?: string, arbeitgeberZahlt?: boolean) => void;
  buchungLoading: string | null;
}) {
  const [selectedTermin, setSelectedTermin] = useState<string>("");
  const [arbeitgeberZahlt, setArbeitgeberZahlt] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("lernziele");

  const termine = kurs.naechste_termine ?? [];
  const isLoading = buchungLoading === kurs.id;

  function toggleSection(section: string) {
    setExpandedSection((prev) => (prev === section ? null : section));
  }

  function handleBuchen() {
    onBuchen(kurs, selectedTermin || undefined, arbeitgeberZahlt);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NIVEAU_COLORS[kurs.niveau]}`}>
                {NIVEAU_LABELS[kurs.niveau]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORMAT_COLORS[kurs.format]}`}>
                {FORMAT_LABELS[kurs.format]}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{kurs.titel}</h2>
            {kurs.kurs_anbieter && (
              <p className="text-sm text-gray-500 mt-1">{kurs.kurs_anbieter.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Provider cert badges */}
          {kurs.kurs_anbieter?.zertifizierungen && kurs.kurs_anbieter.zertifizierungen.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {kurs.kurs_anbieter.zertifizierungen.map((cert) => (
                <CertBadge key={cert} cert={cert} />
              ))}
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">{kurs.dauer_stunden}h</p>
              <p className="text-[10px] text-gray-400">Dauer</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Euro className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">{formatPreis(kurs.preis_regulaer)}</p>
              <p className="text-[10px] text-gray-400">Preis</p>
            </div>
            {kurs.preis_foerderung && (
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-sm font-semibold text-green-700">{formatPreis(kurs.preis_foerderung)}</p>
                <p className="text-[10px] text-green-600">Mit Förderung</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <StarRating rating={kurs.bewertung_schnitt} count={kurs.anzahl_bewertungen} />
              <p className="text-[10px] text-gray-400 mt-1">Bewertung</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Beschreibung</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{kurs.beschreibung}</p>
          </div>

          {/* Zertifikat */}
          {kurs.zertifikat_name && (
            <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-3.5 border border-indigo-100">
              <GraduationCap className="w-8 h-8 text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-indigo-500 font-medium">Sie erhalten</p>
                <p className="text-sm font-semibold text-indigo-800">{kurs.zertifikat_name}</p>
              </div>
            </div>
          )}

          {/* Lernziele */}
          {kurs.lernziele && kurs.lernziele.length > 0 && (
            <div>
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection("lernziele")}
              >
                <h3 className="text-sm font-semibold text-gray-900">Lernziele</h3>
                {expandedSection === "lernziele" ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedSection === "lernziele" && (
                <ul className="mt-2 space-y-1.5">
                  {kurs.lernziele.map((ziel, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {ziel}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Termine */}
          {termine.length > 0 && (
            <div>
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection("termine")}
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  Verfügbare Termine ({termine.length})
                </h3>
                {expandedSection === "termine" ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedSection === "termine" && (
                <div className="mt-2 space-y-2">
                  {termine.map((t, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedTermin === t.datum
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      } ${t.freie_plaetze === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="termin"
                        value={t.datum}
                        checked={selectedTermin === t.datum}
                        onChange={() => t.freie_plaetze > 0 && setSelectedTermin(t.datum)}
                        disabled={t.freie_plaetze === 0}
                        className="accent-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{formatDatumLang(t.datum)}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {t.ort}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          t.freie_plaetze === 0
                            ? "bg-red-100 text-red-600"
                            : t.freie_plaetze <= 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {t.freie_plaetze === 0 ? "Ausgebucht" : `${t.freie_plaetze} frei`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Förderung info */}
          {kurs.foerderung_info && (
            <div className="flex items-start gap-2.5 bg-green-50 rounded-xl p-3.5 border border-green-100">
              <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 leading-relaxed">{kurs.foerderung_info}</p>
            </div>
          )}

          {/* Booking form toggle */}
          {!isBucht && !showBookForm && (
            <button
              onClick={() => setShowBookForm(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-200 text-sm text-blue-600 font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              Anmeldeoptionen anzeigen
            </button>
          )}

          {/* Booking form */}
          {!isBucht && showBookForm && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-3">
              <h3 className="text-sm font-semibold text-blue-900">Anmeldung</h3>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={arbeitgeberZahlt}
                  onChange={(e) => setArbeitgeberZahlt(e.target.checked)}
                  className="mt-1 accent-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                    Arbeitgeber übernimmt Kosten
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Direkte Abrechnung mit Ihrem Arbeitgeber
                  </p>
                </div>
              </label>

              {!selectedTermin && termine.length > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Bitte wählen Sie einen Termin aus
                </p>
              )}

              <button
                onClick={handleBuchen}
                disabled={isLoading || (termine.length > 0 && !selectedTermin)}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verbindlich anmelden
              </button>
            </div>
          )}

          {isBucht && (
            <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3.5 border border-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">Sie sind für diesen Kurs angemeldet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Meine Kurse Card ─────────────────────────────────────────────────────────

function MeineKursCard({ buchung, fortschritt }: { buchung: Buchung; fortschritt?: number }) {
  const isELearning = buchung.kurse?.kategorie === "digitalisierung";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 leading-snug line-clamp-2">
            {buchung.kurse?.titel ?? "Kurs"}
          </h3>
          {buchung.termin_datum && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDatum(buchung.termin_datum)}
            </p>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[buchung.status]}`}>
          {STATUS_LABELS[buchung.status]}
        </span>
      </div>

      {/* E-learning progress */}
      {isELearning && fortschritt !== undefined && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Lernfortschritt</span>
            <span className="text-xs font-semibold text-gray-700">{fortschritt}%</span>
          </div>
          <ProgressBar percent={fortschritt} />
        </div>
      )}

      {/* Certificate download */}
      {buchung.zertifikat_ausgestellt && (
        <button className="flex items-center gap-2 text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
          <Download className="w-3.5 h-3.5" />
          Zertifikat herunterladen
        </button>
      )}

      {buchung.status === "abgeschlossen" && !buchung.zertifikat_ausgestellt && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          Zertifikat wird ausgestellt
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialKurse: Kurs[];
  initialBuchungen: Buchung[];
}

export function WeiterbildungClient({ initialKurse, initialBuchungen }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("kurse");
  const [kurse, setKurse] = useState<Kurs[]>(initialKurse);
  const [buchungen, setBuchungen] = useState<Buchung[]>(initialBuchungen);
  const [selectedKurs, setSelectedKurs] = useState<Kurs | null>(null);
  const [buchungLoading, setBuchungLoading] = useState<string | null>(null);
  const [buchungSuccess, setBuchungSuccess] = useState<string | null>(null);
  const [buchungError, setBuchungError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterKategorie, setFilterKategorie] = useState<KursKategorie | "alle">("alle");
  const [filterFormat, setFilterFormat] = useState<KursFormat | "alle">("alle");
  const [filterMaxPreis, setFilterMaxPreis] = useState(2000);
  const [filterNurFoerderung, setFilterNurFoerderung] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Set of booked kurs IDs
  const buchteKursIds = new Set(
    buchungen.filter((b) => b.status !== "storniert").map((b) => b.kurs_id)
  );

  // Filter kurse client-side (server already fetched initial set)
  const filteredKurse = kurse.filter((k) => {
    if (search && !k.titel.toLowerCase().includes(search.toLowerCase()) &&
        !k.beschreibung.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterKategorie !== "alle" && k.kategorie !== filterKategorie) return false;
    if (filterFormat !== "alle" && k.format !== filterFormat) return false;
    if (k.preis_regulaer > filterMaxPreis) return false;
    if (filterNurFoerderung && !k.foerderung_moeglich) return false;
    return true;
  });

  // Fetch filtered results from API when filters change significantly
  const fetchKurse = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterKategorie !== "alle") params.set("kategorie", filterKategorie);
    if (filterFormat !== "alle") params.set("format", filterFormat);
    if (filterNurFoerderung) params.set("foerderung", "true");
    if (search) params.set("q", search);
    params.set("max_preis", String(filterMaxPreis));

    try {
      const res = await fetch(`/api/weiterbildung?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setKurse(json.kurse ?? []);
    } catch {
      // silently fail — local filter still works
    }
  }, [filterKategorie, filterFormat, filterNurFoerderung, search, filterMaxPreis]);

  async function handleBuchen(kurs: Kurs, terminDatum?: string, arbeitgeberZahlt?: boolean) {
    setBuchungLoading(kurs.id);
    setBuchungSuccess(null);
    setBuchungError(null);

    try {
      const res = await fetch("/api/weiterbildung/buchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kurs_id: kurs.id,
          termin_datum: terminDatum ?? undefined,
          arbeitgeber_zahlt: arbeitgeberZahlt ?? false,
        }),
      });

      if (res.status === 409) {
        setBuchungError("Sie sind bereits für diesen Kurs angemeldet.");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        setBuchungError(err.error ?? "Buchung fehlgeschlagen");
        return;
      }

      const json = await res.json();
      setBuchungSuccess(json.message ?? "Erfolgreich angemeldet!");

      // Add to local buchungen state
      const newBuchung: Buchung = {
        id: json.id,
        status: "angemeldet",
        termin_datum: terminDatum ?? null,
        kurs_id: kurs.id,
        zertifikat_ausgestellt: false,
        erstellt_am: new Date().toISOString(),
        kurse: { titel: kurs.titel, kategorie: kurs.kategorie },
      };
      setBuchungen((prev) => [newBuchung, ...prev]);
      setSelectedKurs(null);
    } catch {
      setBuchungError("Netzwerkfehler — bitte versuchen Sie es erneut");
    } finally {
      setBuchungLoading(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => { fetchKurse(); });
  }

  const activeBuchungen = buchungen.filter((b) => b.status !== "storniert");
  const abgeschlosseneBuchungen = buchungen.filter((b) => b.status === "abgeschlossen");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("kurse")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "kurse"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Kursangebot
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {filteredKurse.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("meine")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "meine"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Meine Kurse
          {activeBuchungen.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {activeBuchungen.length}
            </span>
          )}
        </button>
      </div>

      {/* Global messages */}
      {buchungSuccess && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{buchungSuccess}</span>
          <button onClick={() => setBuchungSuccess(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {buchungError && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span>{buchungError}</span>
          <button onClick={() => setBuchungError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── KURSE TAB ── */}
      {activeTab === "kurse" && (
        <div className="space-y-4">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Kurs suchen, z.B. Palliativpflege, Demenz …"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                showFilters
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suchen"}
            </button>
          </form>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
              {/* Format filter */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Format</p>
                <div className="flex flex-wrap gap-2">
                  {FORMATE.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilterFormat(f.value as KursFormat | "alle")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        filterFormat === f.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <f.icon className="w-3.5 h-3.5" />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Max. Preis
                  </p>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatPreis(filterMaxPreis)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3000}
                  step={50}
                  value={filterMaxPreis}
                  onChange={(e) => setFilterMaxPreis(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0 €</span>
                  <span>3.000 €</span>
                </div>
              </div>

              {/* Förderung toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setFilterNurFoerderung(!filterNurFoerderung)}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                    filterNurFoerderung ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      filterNurFoerderung ? "translate-x-5" : ""
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Nur Kurse mit Förderungsmöglichkeit
                </span>
              </label>
            </div>
          )}

          {/* Kategorie pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {KATEGORIEN.map((k) => (
              <button
                key={k.value}
                onClick={() => setFilterKategorie(k.value as KursKategorie | "alle")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                  filterKategorie === k.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                <k.icon className="w-3.5 h-3.5" />
                {k.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {filteredKurse.length} Kurs{filteredKurse.length !== 1 ? "e" : ""} gefunden
            </span>
            {(filterKategorie !== "alle" || filterFormat !== "alle" || filterNurFoerderung || search) && (
              <button
                onClick={() => {
                  setFilterKategorie("alle");
                  setFilterFormat("alle");
                  setFilterNurFoerderung(false);
                  setFilterMaxPreis(2000);
                  setSearch("");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Filter zurücksetzen
              </button>
            )}
          </div>

          {/* Course grid */}
          {filteredKurse.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredKurse.map((kurs) => (
                <KursCard
                  key={kurs.id}
                  kurs={kurs}
                  isBucht={buchteKursIds.has(kurs.id)}
                  onDetails={(k) => setSelectedKurs(k)}
                  onBuchen={(k) => handleBuchen(k)}
                  buchungLoading={buchungLoading}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Keine Kurse gefunden</p>
              <p className="text-sm mt-1">Versuchen Sie andere Suchbegriffe oder Filter</p>
            </div>
          )}
        </div>
      )}

      {/* ── MEINE KURSE TAB ── */}
      {activeTab === "meine" && (
        <div className="space-y-5">
          {/* Earned certificates summary */}
          {abgeschlosseneBuchungen.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-indigo-900 text-sm">
                  Ihre Qualifikationen ({abgeschlosseneBuchungen.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {abgeschlosseneBuchungen.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-xs font-medium text-indigo-700 shadow-sm"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    {b.kurse?.titel ?? "Kurs"}
                    {b.zertifikat_ausgestellt && (
                      <BadgeCheck className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeBuchungen.length > 0 ? (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Aktive Anmeldungen ({activeBuchungen.filter((b) => b.status !== "abgeschlossen").length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeBuchungen
                    .filter((b) => b.status !== "abgeschlossen")
                    .map((b) => (
                      <MeineKursCard key={b.id} buchung={b} />
                    ))}
                </div>
              </div>

              {abgeschlosseneBuchungen.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Abgeschlossen ({abgeschlosseneBuchungen.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {abgeschlosseneBuchungen.map((b) => (
                      <MeineKursCard key={b.id} buchung={b} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Noch keine Kursanmeldungen</p>
              <p className="text-sm mt-1 mb-4">
                Entdecken Sie unser Kursangebot und melden Sie sich für Ihre erste Weiterbildung an
              </p>
              <button
                onClick={() => setActiveTab("kurse")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Zum Kursangebot
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selectedKurs && (
        <KursDetailModal
          kurs={selectedKurs}
          isBucht={buchteKursIds.has(selectedKurs.id)}
          onClose={() => setSelectedKurs(null)}
          onBuchen={handleBuchen}
          buchungLoading={buchungLoading}
        />
      )}
    </div>
  );
}
