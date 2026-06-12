"use client";

import { useState } from "react";
import {
  Download,
  Send,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  FileJson,
  Network,
  Shield,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Zap,
  BookOpen,
} from "lucide-react";

interface Klient {
  familieProfileId: string;
  name: string;
  letztesDatum: string | null;
}

interface InteropHubClientProps {
  klienten: Klient[];
}

type KVMessageType =
  | "ARZT_ANFRAGE"
  | "PFLEGEBERICHT"
  | "ENTLASSBRIEF"
  | "PFLEGEGRAD_MELDUNG"
  | "TERMIN_ANFRAGE";

interface FhirExportState {
  loading: boolean;
  done: boolean;
  error: string | null;
  entryCount?: number;
}

interface KVConnectState {
  loading: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
}

const KV_MESSAGE_TYPES: { type: KVMessageType; label: string; desc: string }[] = [
  { type: "ARZT_ANFRAGE",       label: "Arzt-Anfrage",         desc: "Anfrage bei behandelndem Arzt" },
  { type: "PFLEGEBERICHT",      label: "Pflegebericht",         desc: "Pflegebericht an KV senden" },
  { type: "ENTLASSBRIEF",       label: "Entlassbrief",          desc: "Übergabe-Dokumentation" },
  { type: "PFLEGEGRAD_MELDUNG", label: "PG-Meldung",            desc: "Pflegegrad-Änderung melden" },
  { type: "TERMIN_ANFRAGE",     label: "Terminanfrage",          desc: "Über KV-Terminservice buchen" },
];

const STANDARDS = [
  {
    name: "FHIR R4",
    status: "aktiv",
    color: "green",
    desc: "HL7 FHIR Release 4 — internationaler Standard für Gesundheitsdatenaustausch",
    link: "https://hl7.org/fhir/R4/",
    resources: ["Patient", "Observation", "MedicationAdministration", "ClinicalImpression"],
  },
  {
    name: "KV-Connect",
    status: "stub",
    color: "amber",
    desc: "Kassenärztliche Vereinigung Kommunikationsstandard — Simulation für Entwicklung",
    link: "https://www.kbv.de/html/kv-connect.php",
    resources: ["SOAP/TLS", "KVDT", "SMC-B Auth"],
  },
  {
    name: "IHE XDS.b",
    status: "geplant",
    color: "gray",
    desc: "Cross-Enterprise Document Sharing — für Klinik-Einbindung geplant",
    link: "https://www.ihe.net/",
    resources: ["Dokumenten-Registry", "Repository", "Consumer"],
  },
  {
    name: "§291a SGB V",
    status: "konform",
    color: "blue",
    desc: "Telematikinfrastruktur-Compliance — Datenschutz & Sicherheitsanforderungen",
    link: "https://www.gesetze-im-internet.de/sgb_5/__291a.html",
    resources: ["ePA", "eAU", "eRezept"],
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aktiv:   "bg-green-100 text-green-700 border-green-200",
    stub:    "bg-amber-100 text-amber-700 border-amber-200",
    geplant: "bg-gray-100 text-gray-600 border-gray-200",
    konform: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const labels: Record<string, string> = {
    aktiv:   "Aktiv",
    stub:    "Stub / Demo",
    geplant: "Geplant",
    konform: "Konform",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function InteropHubClient({ klienten }: InteropHubClientProps) {
  const [selectedKlient, setSelectedKlient] = useState<string>(klienten[0]?.familieProfileId ?? "");
  const [vonDate, setVonDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [bisDate, setBisDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [fhirState, setFhirState] = useState<FhirExportState>({ loading: false, done: false, error: null });

  // KV-Connect
  const [kvMessageType, setKvMessageType] = useState<KVMessageType>("PFLEGEBERICHT");
  const [kvInhalt, setKvInhalt] = useState("");
  const [kvPrioritaet, setKvPrioritaet] = useState<"NORMAL" | "DRINGEND" | "NOTFALL">("NORMAL");
  const [kvState, setKvState] = useState<KVConnectState>({ loading: false, result: null, error: null });

  const [expandedStandard, setExpandedStandard] = useState<string | null>(null);

  const selectedKlientName = klienten.find(k => k.familieProfileId === selectedKlient)?.name ?? "—";

  // ── FHIR Export ────────────────────────────────────────────────────────────
  const handleFhirExport = async () => {
    if (!selectedKlient) return;
    setFhirState({ loading: true, done: false, error: null });
    try {
      const params = new URLSearchParams({ familieProfileId: selectedKlient });
      if (vonDate) params.set("von", vonDate);
      if (bisDate) params.set("bis", bisDate);

      const res = await fetch(`/api/fhir?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const json = JSON.parse(await blob.text());
      const entryCount = json.total ?? json.entry?.length ?? 0;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        `fhir-export-${selectedKlient.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setFhirState({ loading: false, done: true, error: null, entryCount });
    } catch (err) {
      setFhirState({ loading: false, done: false, error: err instanceof Error ? err.message : String(err) });
    }
  };

  // ── KV-Connect Send ────────────────────────────────────────────────────────
  const handleKVConnect = async () => {
    setKvState({ loading: true, result: null, error: null });
    try {
      const res = await fetch("/api/kv-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType: kvMessageType,
          familieProfileId: selectedKlient || undefined,
          inhalt: kvInhalt || undefined,
          prioritaet: kvPrioritaet,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setKvState({ loading: false, result: data, error: null });
    } catch (err) {
      setKvState({ loading: false, result: null, error: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Network className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[--foreground]">Interoperabilitäts-Hub</h1>
            <p className="text-sm text-[--muted-foreground]">FHIR R4 Export · KV-Connect · Standards-Compliance</p>
          </div>
        </div>

        {/* Simulation Banner */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Entwicklungs- und Demonstrationsmodus</p>
            <p className="mt-1">
              KV-Connect ist als Stub implementiert — Nachrichten werden nicht real übermittelt. FHIR-Export ist
              funktional. Für den Produktivbetrieb ist eine KV-Connect-Zertifizierung sowie ein zertifizierter
              TI-Konnektor erforderlich.
            </p>
          </div>
        </div>
      </div>

      {/* Klient-Auswahl */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-5">
        <h2 className="font-semibold text-[--foreground] mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[--muted-foreground]" />
          Klient auswählen
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Klient</label>
            <select
              value={selectedKlient}
              onChange={e => setSelectedKlient(e.target.value)}
              className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
            >
              <option value="">— Klient wählen —</option>
              {klienten.map(k => (
                <option key={k.familieProfileId} value={k.familieProfileId}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Von (Datum)</label>
            <input
              type="date"
              value={vonDate}
              onChange={e => setVonDate(e.target.value)}
              className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Bis (Datum)</label>
            <input
              type="date"
              value={bisDate}
              onChange={e => setBisDate(e.target.value)}
              className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── FHIR R4 Export ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
              <FileJson className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-[--foreground]">FHIR R4 Export</h2>
              <p className="text-xs text-[--muted-foreground]">HL7 FHIR R4 Bundle · application/fhir+json</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 text-sm text-[--muted-foreground]">
            <p>Exportiert Pflegedaten als standardkonformes FHIR R4 Bundle mit:</p>
            <ul className="space-y-1 ml-4">
              {["Patient-Ressource", "Observation (Vitalzeichen mit LOINC-Codes)", "MedicationAdministration", "ClinicalImpression (Dokumentation)"].map(r => (
                <li key={r} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
            <p className="text-xs">Zeitraum: {vonDate || "—"} bis {bisDate || "—"}</p>
          </div>

          {fhirState.error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {fhirState.error}
            </div>
          )}

          {fhirState.done && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Export erfolgreich — {fhirState.entryCount ?? "?"} FHIR-Ressourcen exportiert
            </div>
          )}

          <button
            onClick={handleFhirExport}
            disabled={fhirState.loading || !selectedKlient}
            className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {fhirState.loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Exportiere…</>
            ) : (
              <><Download className="h-4 w-4" />FHIR R4 Bundle herunterladen{selectedKlient ? ` — ${selectedKlientName}` : ""}</>
            )}
          </button>
        </div>

        {/* ── KV-Connect ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Network className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-[--foreground]">KV-Connect</h2>
              <p className="text-xs text-[--muted-foreground]">Stub-Simulation · kein echter Versand</p>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {/* Message Type */}
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Nachrichtentyp</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {KV_MESSAGE_TYPES.map(({ type, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setKvMessageType(type)}
                    className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                      kvMessageType === type
                        ? "border-amber-400 bg-amber-50 text-amber-800"
                        : "border-[--border] bg-[--background] text-[--muted-foreground] hover:border-amber-300"
                    }`}
                  >
                    <span className="font-medium text-sm">{label}</span>
                    <span className="text-[10px] mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priorität */}
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Priorität</label>
              <div className="flex gap-2">
                {(["NORMAL", "DRINGEND", "NOTFALL"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setKvPrioritaet(p)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      kvPrioritaet === p
                        ? p === "NOTFALL"
                          ? "border-red-400 bg-red-50 text-red-700"
                          : p === "DRINGEND"
                          ? "border-orange-400 bg-orange-50 text-orange-700"
                          : "border-[--primary] bg-[--primary-light] text-[--primary]"
                        : "border-[--border] bg-[--background] text-[--muted-foreground] hover:border-[--primary]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Inhalt */}
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Nachrichteninhalt (optional)</label>
              <textarea
                value={kvInhalt}
                onChange={e => setKvInhalt(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                placeholder="Freitext-Inhalt der Nachricht…"
              />
            </div>
          </div>

          {kvState.error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {kvState.error}
            </div>
          )}

          {kvState.result && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4 text-amber-600 shrink-0" />
                {(kvState.result.antwort as Record<string, unknown>)?.status as string ?? "Simuliert übermittelt"}
              </div>
              <p>{(kvState.result.antwort as Record<string, unknown>)?.bestaetigungstext as string}</p>
              {(kvState.result.antwort as Record<string, unknown>)?.protokollnummer && (
                <p className="font-mono text-[10px]">
                  Protokoll: {(kvState.result.antwort as Record<string, unknown>).protokollnummer as string}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleKVConnect}
            disabled={kvState.loading}
            className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {kvState.loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Sende…</>
            ) : (
              <><Send className="h-4 w-4" />KV-Connect Nachricht senden (Simulation)</>
            )}
          </button>
        </div>
      </div>

      {/* Standards-Compliance-Übersicht */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-5">
        <h2 className="font-semibold text-[--foreground] mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[--muted-foreground]" />
          Standards & Compliance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STANDARDS.map((std) => {
            const isOpen = expandedStandard === std.name;
            return (
              <div key={std.name} className="rounded-xl border border-[--border] overflow-hidden">
                <button
                  onClick={() => setExpandedStandard(isOpen ? null : std.name)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[--muted]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={std.status} />
                    <span className="font-semibold text-sm text-[--foreground]">{std.name}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 border-t border-[--border] space-y-3">
                    <p className="text-sm text-[--muted-foreground]">{std.desc}</p>
                    <div>
                      <p className="text-xs font-medium text-[--foreground] mb-1">Unterstützte Ressourcen:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {std.resources.map(r => (
                          <span key={r} className="rounded-full bg-[--muted] px-2 py-0.5 text-xs text-[--muted-foreground] font-mono">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <a
                      href={std.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[--primary] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Dokumentation
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info-Footer */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Interoperabilitätsstrategie xcare</p>
          <p className="mt-1">
            xcare implementiert offene Standards (FHIR R4, HL7, IHE) für maximale Kompatibilität mit Krankenhaus-
            und Praxissystemen. Der FHIR-Export ermöglicht die Integration in EHR-Systeme wie Systhemis, ixCare, oder
            Orbis. KV-Connect ermöglicht die direkte Kommunikation mit Kassenärztlichen Vereinigungen für abrechnungsrelevante
            Vorgänge.
          </p>
        </div>
      </div>
    </div>
  );
}
