"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, CheckCircle2,
  Clock, Plus, X, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BEREICHE = [
  { value: "pflegedoku",       label: "Pflegedokumentation", icon: "📋" },
  { value: "hygiene",          label: "Hygienemanagement",   icon: "🧼" },
  { value: "medikamente",      label: "Medikamentensicherheit", icon: "💊" },
  { value: "wundversorgung",   label: "Wundversorgung",      icon: "🩹" },
  { value: "sturzpraevention", label: "Sturzprävention",     icon: "🦺" },
  { value: "ernaehrung",       label: "Ernährung",           icon: "🥗" },
  { value: "personal",         label: "Personalmanagement",  icon: "👥" },
  { value: "datenschutz",      label: "Datenschutz (DSGVO)", icon: "🔒" },
] as const;

type Bereich = (typeof BEREICHE)[number]["value"];

type ComplianceCheck = {
  id: string;
  bereich: Bereich;
  kriterium: string;
  erfuellt: boolean | null;
  nachweis?: string | null;
  faellig_am?: string | null;
  letzte_pruefung?: string | null;
};

type Pruefung = {
  id: string;
  pruefung_typ: string;
  pruefung_datum: string;
  ergebnis?: string | null;
  note_gesamt?: number | null;
  massnahmen?: string | null;
};

type Beschwerde = {
  id: string;
  kategorie: string;
  schweregrad: string;
  status: string;
  beschreibung: string;
  eingegangen_am: string;
  frist_am: string;
};

interface Props {
  initialChecks: ComplianceCheck[];
  pruefungen: Pruefung[];
  beschwerden: Beschwerde[];
  anbieterName: string;
}

const MDK_STANDARD_CHECKS: Omit<ComplianceCheck, "id" | "erfuellt" | "nachweis" | "faellig_am" | "letzte_pruefung">[] = [
  { bereich: "pflegedoku", kriterium: "Pflegeplanung für alle Bewohner aktuell und signiert" },
  { bereich: "pflegedoku", kriterium: "Verlaufsberichte täglich dokumentiert (§ 113 SGB XI)" },
  { bereich: "hygiene", kriterium: "Hygiene-Plan vorhanden und aktuell" },
  { bereich: "hygiene", kriterium: "Händehygiene-Schulungen dokumentiert" },
  { bereich: "medikamente", kriterium: "Medikamentenplan für alle Bewohner vorhanden" },
  { bereich: "medikamente", kriterium: "Doppelte Kontrolle bei Hochrisiko-Medikamenten" },
  { bereich: "sturzpraevention", kriterium: "Sturzrisiko-Einschätzung durchgeführt" },
  { bereich: "personal", kriterium: "Qualifikationsnachweise aller Mitarbeiter aktuell" },
  { bereich: "datenschutz", kriterium: "Datenschutz-Schulungen durchgeführt und dokumentiert" },
];

export function ComplianceClient({ initialChecks, pruefungen, beschwerden, anbieterName }: Props) {
  const [checks, setChecks] = useState<ComplianceCheck[]>(initialChecks);
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedBereich, setExpandedBereich] = useState<Bereich | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCheck, setNewCheck] = useState({ bereich: "pflegedoku" as Bereich, kriterium: "", faellig_am: "" });
  const [addLoading, setAddLoading] = useState(false);

  const byBereich = useMemo(() => {
    const map: Partial<Record<Bereich, ComplianceCheck[]>> = {};
    for (const c of checks) {
      if (!map[c.bereich]) map[c.bereich] = [];
      map[c.bereich]!.push(c);
    }
    return map;
  }, [checks]);

  const gesamtScore = useMemo(() => {
    const total = checks.length;
    if (total === 0) return null;
    const erfuellt = checks.filter(c => c.erfuellt === true).length;
    return Math.round((erfuellt / total) * 100);
  }, [checks]);

  const ueberfaellig = checks.filter(c =>
    c.faellig_am && new Date(c.faellig_am) < new Date() && c.erfuellt !== true
  ).length;

  const handleToggle = async (check: ComplianceCheck) => {
    const newVal = check.erfuellt === true ? false : true;
    setLoading(check.id);
    try {
      const res = await fetch(`/api/compliance/${check.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erfuellt: newVal }),
      });
      if (!res.ok) throw new Error("Fehler");
      setChecks(prev => prev.map(c =>
        c.id === check.id ? { ...c, erfuellt: newVal, letzte_pruefung: newVal ? new Date().toISOString().slice(0, 10) : c.letzte_pruefung } : c
      ));
      toast.success(newVal ? "Als erfüllt markiert" : "Als nicht erfüllt markiert");
    } catch {
      toast.error("Aktualisierung fehlgeschlagen");
    } finally {
      setLoading(null);
    }
  };

  const handleAddStandard = async () => {
    const toAdd = MDK_STANDARD_CHECKS.filter(s =>
      !checks.some(c => c.bereich === s.bereich && c.kriterium === s.kriterium)
    );
    if (toAdd.length === 0) { toast.info("Alle Standard-Checks bereits vorhanden"); return; }
    setAddLoading(true);
    try {
      const results: ComplianceCheck[] = [];
      for (const item of toAdd) {
        const res = await fetch("/api/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (res.ok) results.push(await res.json());
      }
      setChecks(prev => [...prev, ...results]);
      toast.success(`${results.length} MDK-Standard-Checks hinzugefügt`);
    } catch {
      toast.error("Fehler beim Hinzufügen");
    } finally {
      setAddLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCheck.kriterium.trim()) { toast.error("Bitte Kriterium eingeben"); return; }
    setAddLoading(true);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCheck),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setChecks(prev => [...prev, data]);
      setNewCheck({ bereich: "pflegedoku", kriterium: "", faellig_am: "" });
      setShowAddForm(false);
      toast.success("Check hinzugefügt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Check löschen?")) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/compliance/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler");
      setChecks(prev => prev.filter(c => c.id !== id));
      toast.success("Gelöscht");
    } catch { toast.error("Löschen fehlgeschlagen"); }
    finally { setLoading(null); }
  };

  const scoreColor = gesamtScore === null ? "text-gray-400"
    : gesamtScore >= 90 ? "text-green-600"
    : gesamtScore >= 70 ? "text-yellow-600"
    : "text-red-600";

  const ScoreIcon = gesamtScore === null ? ShieldCheck
    : gesamtScore >= 90 ? ShieldCheck
    : gesamtScore >= 70 ? ShieldAlert
    : ShieldX;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qualitätssicherung & MDK-Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">{anbieterName} — §§ 113 ff. SGB XI</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddStandard} disabled={addLoading} className="text-sm">
            {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            MDK-Standard laden
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm">
            <Plus className="h-4 w-4" /> Check hinzufügen
          </Button>
        </div>
      </div>

      {/* Compliance Score */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <ScoreIcon className={`h-5 w-5 ${scoreColor}`} />
            <p className="text-xs text-gray-500">Compliance-Score</p>
          </div>
          <p className={`text-3xl font-bold ${scoreColor}`}>
            {gesamtScore !== null ? `${gesamtScore}%` : "–"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Checks erfüllt</p>
          <p className="text-2xl font-bold text-green-600">
            {checks.filter(c => c.erfuellt).length} / {checks.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Überfällig</p>
          <p className={`text-2xl font-bold ${ueberfaellig > 0 ? "text-red-600" : "text-gray-400"}`}>
            {ueberfaellig}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Offene Beschwerden</p>
          <p className={`text-2xl font-bold ${beschwerden.filter(b => b.status === "offen").length > 0 ? "text-orange-600" : "text-gray-400"}`}>
            {beschwerden.filter(b => b.status === "offen").length}
          </p>
        </Card>
      </div>

      {/* Letzte MDK-Prüfung */}
      {pruefungen.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Letzte Qualitätsprüfungen</p>
          <div className="space-y-2">
            {pruefungen.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-600">
                    {p.pruefung_typ === "mdk_pruefung" ? "MDK-Prüfung" : p.pruefung_typ}
                  </span>
                  <span className="text-gray-400">{new Date(p.pruefung_datum).toLocaleDateString("de-DE")}</span>
                </div>
                {p.note_gesamt && (
                  <span className={`font-semibold ${p.note_gesamt <= 2 ? "text-green-600" : p.note_gesamt <= 3 ? "text-yellow-600" : "text-red-600"}`}>
                    Note: {p.note_gesamt}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Neuer Check Form */}
      {showAddForm && (
        <Card className="p-5 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Neuen Check hinzufügen</h3>
            <button onClick={() => setShowAddForm(false)} aria-label="Schließen">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bereich *</label>
              <select
                value={newCheck.bereich}
                onChange={e => setNewCheck(n => ({ ...n, bereich: e.target.value as Bereich }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BEREICHE.map(b => (
                  <option key={b.value} value={b.value}>{b.icon} {b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fällig am</label>
              <input
                type="date"
                value={newCheck.faellig_am}
                onChange={e => setNewCheck(n => ({ ...n, faellig_am: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Kriterium *</label>
              <input
                type="text"
                placeholder="z.B. Pflegeplanung aktuell und signiert"
                value={newCheck.kriterium}
                onChange={e => setNewCheck(n => ({ ...n, kriterium: e.target.value }))}
                maxLength={500}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={addLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Speichern
            </Button>
          </div>
        </Card>
      )}

      {/* Checks nach Bereich */}
      <div className="space-y-3">
        {BEREICHE.map(bereich => {
          const bereichChecks = byBereich[bereich.value] ?? [];
          if (bereichChecks.length === 0 && !expandedBereich) return null;
          const erfuellt = bereichChecks.filter(c => c.erfuellt).length;
          const pct = bereichChecks.length > 0 ? Math.round((erfuellt / bereichChecks.length) * 100) : 0;
          const isExpanded = expandedBereich === bereich.value;
          const hasIssues = bereichChecks.some(c => !c.erfuellt && c.faellig_am && new Date(c.faellig_am) < new Date());

          return (
            <Card key={bereich.value} className={`overflow-hidden ${hasIssues ? "border-red-200" : ""}`}>
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedBereich(isExpanded ? null : bereich.value)}
              >
                <span className="text-lg">{bereich.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{bereich.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-green-500" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{erfuellt}/{bereichChecks.length}</span>
                  </div>
                </div>
                {hasIssues && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {bereichChecks.length === 0 ? (
                    <p className="text-center py-6 text-sm text-gray-400">Keine Checks. Klicken Sie auf „MDK-Standard laden".</p>
                  ) : (
                    bereichChecks.map(check => {
                      const isOverdue = check.faellig_am && new Date(check.faellig_am) < new Date() && !check.erfuellt;
                      return (
                        <div key={check.id} className={`flex items-start gap-3 px-4 py-3 ${isOverdue ? "bg-red-50" : ""}`}>
                          <button
                            onClick={() => handleToggle(check)}
                            disabled={loading === check.id}
                            className="mt-0.5 shrink-0"
                          >
                            {loading === check.id ? (
                              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                            ) : check.erfuellt ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${check.erfuellt ? "text-gray-400 line-through" : "text-gray-800"}`}>
                              {check.kriterium}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                              {check.letzte_pruefung && (
                                <span>Letzte Prüfung: {new Date(check.letzte_pruefung).toLocaleDateString("de-DE")}</span>
                              )}
                              {check.faellig_am && !check.erfuellt && (
                                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                  {isOverdue ? "⚠ Überfällig seit " : "Fällig am "}
                                  {new Date(check.faellig_am).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(check.id)}
                            className="shrink-0 p-1 hover:text-red-500 text-gray-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </Card>
          );
        }).filter(Boolean)}
        {checks.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Keine Compliance-Checks vorhanden.<br />
            Klicken Sie auf „MDK-Standard laden" um mit dem Prüfkatalog zu starten.
          </div>
        )}
      </div>
    </div>
  );
}
