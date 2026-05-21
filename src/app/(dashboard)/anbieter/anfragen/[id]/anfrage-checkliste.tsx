"use client";

/**
 * AnfrageCheckliste — S328
 *
 * Per-Anfrage task checklist for Anbieter.
 * Pre-populates with Lebenslage-appropriate default tasks on first load.
 * Persists to `anfrage_aufgaben` via Supabase.
 */

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Circle, Plus, Trash2, Loader2, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Aufgabe {
  id: string;
  titel: string;
  erledigt: boolean;
  created_at: string;
}

// Default tasks per Lebenslage
const DEFAULT_TASKS: Record<string, string[]> = {
  alter_pflege: [
    "Pflegegrad prüfen / beantragen",
    "Kostenvoranschlag erstellen",
    "Pflegeplan aufstellen",
    "Hausbesuch terminieren",
    "Angehörige informieren",
  ],
  krankheit_genesung: [
    "Arztberichte anfordern",
    "Behandlungsplan abstimmen",
    "Kostenübernahme klären",
    "Erstgespräch führen",
  ],
  hospiz_palliativ: [
    "Palliativmedizin konsultieren",
    "Seelsorge anfragen",
    "Wünsche der Familie besprechen",
    "Pflegedokumentation starten",
  ],
  eingliederung_behinderung: [
    "Bedarfsermittlung durchführen",
    "Antrag bei Kostenträger stellen",
    "Hilfsplan erstellen",
    "Erstgespräch führen",
  ],
  geburt_fruehe_kindheit: [
    "Unterstützungsbedarf klären",
    "Erstgespräch mit Familie",
    "Betreuungsplan erstellen",
  ],
  schulkind_jugend: [
    "Betreuungsbedarf ermitteln",
    "Förderplan besprechen",
    "Kontakt zur Schule aufnehmen",
  ],
  erwerbsleben_vereinbarkeit: [
    "Beratungsgespräch führen",
    "Verfügbare Leistungen erläutern",
    "Kostenplan erstellen",
  ],
  trauer_nachlass: [
    "Erstgespräch führen",
    "Angebote erläutern",
    "Nächste Schritte besprechen",
  ],
};

const GENERIC_DEFAULTS = [
  "Erstgespräch führen",
  "Kostenvoranschlag erstellen",
  "Anfrage bestätigen",
];

interface Props {
  anfrageId: string;
  anbieterId: string;
  lebenslage: string;
}

export function AnfrageCheckliste({ anfrageId, anbieterId, lebenslage }: Props) {
  const supabase = createClient();
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitel, setNewTitel] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tasks
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("anfrage_aufgaben")
        .select("id, titel, erledigt, created_at")
        .eq("anfrage_id", anfrageId)
        .eq("anbieter_id", anbieterId)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setAufgaben(data);
        setLoading(false);
        return;
      }

      // First visit — seed with defaults
      const defaults = DEFAULT_TASKS[lebenslage] ?? GENERIC_DEFAULTS;
      const { data: seeded } = await supabase
        .from("anfrage_aufgaben")
        .insert(
          defaults.map((titel) => ({
            anfrage_id: anfrageId,
            anbieter_id: anbieterId,
            titel,
            erledigt: false,
          }))
        )
        .select("id, titel, erledigt, created_at");

      setAufgaben(seeded ?? []);
      setLoading(false);
    }
    load();
  }, [anfrageId, anbieterId, lebenslage, supabase]);

  const toggle = async (aufgabe: Aufgabe) => {
    // Optimistic update
    setAufgaben((prev) =>
      prev.map((a) => (a.id === aufgabe.id ? { ...a, erledigt: !a.erledigt } : a))
    );
    const { error } = await supabase
      .from("anfrage_aufgaben")
      .update({ erledigt: !aufgabe.erledigt })
      .eq("id", aufgabe.id);
    if (error) {
      // Revert on failure
      setAufgaben((prev) =>
        prev.map((a) => (a.id === aufgabe.id ? { ...a, erledigt: aufgabe.erledigt } : a))
      );
      toast.error("Fehler beim Speichern.");
    }
  };

  const addTask = async () => {
    const titel = newTitel.trim();
    if (!titel) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("anfrage_aufgaben")
      .insert({ anfrage_id: anfrageId, anbieter_id: anbieterId, titel, erledigt: false })
      .select("id, titel, erledigt, created_at")
      .single();
    if (data) {
      setAufgaben((prev) => [...prev, data]);
      setNewTitel("");
      inputRef.current?.focus();
    } else if (error) {
      toast.error("Aufgabe konnte nicht erstellt werden.");
    }
    setAdding(false);
  };

  const deleteTask = async (id: string) => {
    setAufgaben((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("anfrage_aufgaben").delete().eq("id", id);
  };

  const done = aufgaben.filter((a) => a.erledigt).length;
  const total = aufgaben.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Aufgaben-Checkliste</span>
        </div>
        {total > 0 && (
          <span className="text-xs text-gray-500">
            {done}/{total} erledigt
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 pt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct === 100 ? "bg-emerald-500" : "bg-blue-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Alle Aufgaben erledigt!
            </p>
          )}
        </div>
      )}

      {/* Task list */}
      <div className="px-4 pb-3 pt-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Lade Aufgaben…
          </div>
        ) : aufgaben.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Noch keine Aufgaben.</p>
        ) : (
          <ul className="space-y-1">
            {aufgaben.map((a) => (
              <li key={a.id} className="group flex items-center gap-2 py-1">
                <button
                  onClick={() => toggle(a)}
                  className={`shrink-0 transition-colors ${
                    a.erledigt ? "text-emerald-500" : "text-gray-300 hover:text-gray-400"
                  }`}
                  aria-label={a.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
                >
                  {a.erledigt ? (
                    <CheckCircle2 className="h-4.5 w-4.5 h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <span
                  className={`flex-1 text-sm leading-snug ${
                    a.erledigt ? "line-through text-gray-400" : "text-gray-700"
                  }`}
                >
                  {a.titel}
                </span>
                <button
                  onClick={() => deleteTask(a.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                  aria-label="Aufgabe löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new task */}
        <div className="flex items-center gap-2 mt-3">
          <input
            ref={inputRef}
            type="text"
            value={newTitel}
            onChange={(e) => setNewTitel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Neue Aufgabe hinzufügen…"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300"
          />
          <button
            onClick={addTask}
            disabled={adding || !newTitel.trim()}
            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}
