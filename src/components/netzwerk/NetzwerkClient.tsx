"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

type Status = "offen" | "in_bearbeitung" | "erledigt";
type Prioritaet = "niedrig" | "normal" | "hoch" | "dringend";
type Kategorie =
  | "arzttermin"
  | "besorgungen"
  | "pflege"
  | "behoerden"
  | "medikamente"
  | "soziales"
  | "sonstiges";

interface Aufgabe {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: Status;
  prioritaet: Prioritaet;
  faellig_am: string | null;
  kategorie: Kategorie | null;
  created_at: string;
  updated_at: string;
  zugewiesen_an: string | null;
  erstellt_von: string;
}

interface Kommentar {
  id: string;
  aufgabe_id: string;
  autor_id: string;
  text: string;
  created_at: string;
}

interface Profile {
  id: string;
  vorname: string;
  nachname: string;
  rolle: string;
  avatar_url: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const KATEGORIE_EMOJIS: Record<Kategorie, string> = {
  arzttermin: "🏥",
  besorgungen: "🛒",
  pflege: "💊",
  behoerden: "📋",
  medikamente: "💉",
  soziales: "👥",
  sonstiges: "📌",
};

const KATEGORIE_LABELS: Record<Kategorie, string> = {
  arzttermin: "Arzttermin",
  besorgungen: "Besorgungen",
  pflege: "Pflege",
  behoerden: "Behörden",
  medikamente: "Medikamente",
  soziales: "Soziales",
  sonstiges: "Sonstiges",
};

const PRIORITAET_COLORS: Record<Prioritaet, string> = {
  niedrig: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  hoch: "bg-orange-100 text-orange-700",
  dringend: "bg-red-100 text-red-700",
};

const PRIORITAET_LABELS: Record<Prioritaet, string> = {
  niedrig: "Niedrig",
  normal: "Normal",
  hoch: "Hoch",
  dringend: "Dringend",
};

const COLUMNS: { key: Status; label: string; color: string; dot: string }[] = [
  { key: "offen", label: "Offen", color: "bg-gray-50 border-gray-200", dot: "bg-gray-400" },
  { key: "in_bearbeitung", label: "In Bearbeitung", color: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  { key: "erledigt", label: "Erledigt", color: "bg-green-50 border-green-200", dot: "bg-green-500" },
];

// ── Helper ─────────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(faellig_am: string | null) {
  if (!faellig_am) return false;
  return new Date(faellig_am) < new Date();
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AufgabeCard({
  aufgabe,
  onClick,
}: {
  aufgabe: Aufgabe;
  onClick: () => void;
}) {
  const overdue = isOverdue(aufgabe.faellig_am) && aufgabe.status !== "erledigt";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
    >
      {/* Title row */}
      <div className="flex items-start gap-2 mb-2">
        {aufgabe.kategorie && (
          <span className="text-lg leading-none mt-0.5 flex-shrink-0">
            {KATEGORIE_EMOJIS[aufgabe.kategorie]}
          </span>
        )}
        <span className="font-medium text-gray-900 text-sm leading-snug group-hover:text-blue-700 transition-colors">
          {aufgabe.titel}
        </span>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITAET_COLORS[aufgabe.prioritaet]}`}
        >
          {PRIORITAET_LABELS[aufgabe.prioritaet]}
        </span>
        {aufgabe.faellig_am && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              overdue
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {overdue ? "⚠ " : ""}
            {formatDate(aufgabe.faellig_am)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── New task modal ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  titel: "",
  beschreibung: "",
  kategorie: "" as Kategorie | "",
  prioritaet: "normal" as Prioritaet,
  faellig_am: "",
  zugewiesen_an: "",
};

function NeueAufgabeModal({
  onClose,
  onSave,
  familieProfileId,
  currentUserId,
}: {
  onClose: () => void;
  onSave: (aufgabe: Aufgabe) => void;
  familieProfileId: string;
  currentUserId: string;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titel.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("familien_aufgaben")
      .insert({
        familie_profile_id: familieProfileId,
        erstellt_von: currentUserId,
        titel: form.titel.trim(),
        beschreibung: form.beschreibung.trim() || null,
        kategorie: form.kategorie || null,
        prioritaet: form.prioritaet,
        faellig_am: form.faellig_am || null,
        zugewiesen_an: form.zugewiesen_an || null,
        status: "offen",
      })
      .select()
      .single();

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSave(data as Aufgabe);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Neue Aufgabe</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel *
            </label>
            <input
              type="text"
              required
              value={form.titel}
              onChange={(e) => setForm({ ...form, titel: e.target.value })}
              placeholder="Was ist zu tun?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <textarea
              rows={3}
              value={form.beschreibung}
              onChange={(e) =>
                setForm({ ...form, beschreibung: e.target.value })
              }
              placeholder="Weitere Details..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategorie
              </label>
              <select
                value={form.kategorie}
                onChange={(e) =>
                  setForm({ ...form, kategorie: e.target.value as Kategorie | "" })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Keine</option>
                {(Object.keys(KATEGORIE_LABELS) as Kategorie[]).map((k) => (
                  <option key={k} value={k}>
                    {KATEGORIE_EMOJIS[k]} {KATEGORIE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priorität
              </label>
              <select
                value={form.prioritaet}
                onChange={(e) =>
                  setForm({ ...form, prioritaet: e.target.value as Prioritaet })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(PRIORITAET_LABELS) as Prioritaet[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITAET_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fällig am
            </label>
            <input
              type="date"
              value={form.faellig_am}
              onChange={(e) => setForm({ ...form, faellig_am: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving || !form.titel.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Speichern…" : "Aufgabe erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function AufgabeDetail({
  aufgabe,
  kommentare,
  currentUserId,
  onClose,
  onStatusChange,
  onKommentarAdded,
}: {
  aufgabe: Aufgabe;
  kommentare: Kommentar[];
  currentUserId: string;
  onClose: () => void;
  onStatusChange: (id: string, status: Status) => void;
  onKommentarAdded: (k: Kommentar) => void;
}) {
  const [kommentarText, setKommentarText] = useState("");
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function handleAddKommentar(e: React.FormEvent) {
    e.preventDefault();
    if (!kommentarText.trim()) return;
    setSending(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("aufgaben_kommentare")
      .insert({
        aufgabe_id: aufgabe.id,
        autor_id: currentUserId,
        text: kommentarText.trim(),
      })
      .select()
      .single();

    setSending(false);
    if (!error && data) {
      onKommentarAdded(data as Kommentar);
      setKommentarText("");
    }
  }

  const thisKommentare = kommentare.filter((k) => k.aufgabe_id === aufgabe.id);
  const overdue =
    isOverdue(aufgabe.faellig_am) && aufgabe.status !== "erledigt";

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md bg-white shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          {aufgabe.kategorie && (
            <span className="text-2xl flex-shrink-0 mt-0.5">
              {KATEGORIE_EMOJIS[aufgabe.kategorie]}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 text-base leading-snug">
              {aufgabe.titel}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITAET_COLORS[aufgabe.prioritaet]}`}
              >
                {PRIORITAET_LABELS[aufgabe.prioritaet]}
              </span>
              {aufgabe.faellig_am && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    overdue
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {overdue ? "⚠ Überfällig · " : "Fällig: "}
                  {formatDate(aufgabe.faellig_am)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Description */}
          {aufgabe.beschreibung && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Beschreibung
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aufgabe.beschreibung}
              </p>
            </div>
          )}

          {/* Status change */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Status ändern
            </h3>
            <div className="flex gap-2 flex-wrap">
              {COLUMNS.map((col) => (
                <button
                  key={col.key}
                  onClick={() => onStatusChange(aufgabe.id, col.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    aufgabe.status === col.key
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      aufgabe.status === col.key ? "bg-white" : col.dot
                    }`}
                  />
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Kommentare ({thisKommentare.length})
            </h3>
            {thisKommentare.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Noch keine Kommentare.
              </p>
            ) : (
              <div className="space-y-3">
                {thisKommentare.map((k) => (
                  <div key={k.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                      {k.autor_id.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {k.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(k.created_at).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <form
          onSubmit={handleAddKommentar}
          className="p-4 border-t border-gray-100 flex gap-2"
        >
          <input
            type="text"
            value={kommentarText}
            onChange={(e) => setKommentarText(e.target.value)}
            placeholder="Kommentar hinzufügen…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !kommentarText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {sending ? "…" : "Senden"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NetzwerkClient({
  initialAufgaben,
  initialKommentare,
  currentUserId,
  currentUserProfile,
  familieProfileId,
}: {
  initialAufgaben: Aufgabe[];
  initialKommentare: Kommentar[];
  currentUserId: string;
  currentUserProfile: Profile;
  familieProfileId: string;
}) {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>(initialAufgaben);
  const [kommentare, setKommentare] = useState<Kommentar[]>(initialKommentare);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAufgabe, setSelectedAufgabe] = useState<Aufgabe | null>(null);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("familien_aufgaben_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "familien_aufgaben" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAufgaben((prev) => [payload.new as Aufgabe, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setAufgaben((prev) =>
              prev.map((a) =>
                a.id === (payload.new as Aufgabe).id
                  ? (payload.new as Aufgabe)
                  : a
              )
            );
            // Update selected if open
            setSelectedAufgabe((prev) =>
              prev?.id === (payload.new as Aufgabe).id
                ? (payload.new as Aufgabe)
                : prev
            );
          } else if (payload.eventType === "DELETE") {
            setAufgaben((prev) =>
              prev.filter((a) => a.id !== (payload.old as Aufgabe).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleStatusChange(id: string, status: Status) {
    const supabase = createClient();
    await supabase
      .from("familien_aufgaben")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Optimistic update
    setAufgaben((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status, updated_at: new Date().toISOString() } : a
      )
    );
    setSelectedAufgabe((prev) =>
      prev?.id === id ? { ...prev, status } : prev
    );
  }

  function handleKommentarAdded(k: Kommentar) {
    setKommentare((prev) => [...prev, k]);
  }

  const totalOffen = aufgaben.filter((a) => a.status === "offen").length;
  const totalBearbeitung = aufgaben.filter(
    (a) => a.status === "in_bearbeitung"
  ).length;

  return (
    <>
      {/* Toolbar */}
      <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{aufgaben.length} Aufgaben</span>
          {totalOffen > 0 && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {totalOffen} offen
            </span>
          )}
          {totalBearbeitung > 0 && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
              {totalBearbeitung} in Bearbeitung
            </span>
          )}
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <span className="text-base leading-none">+</span>
          Neue Aufgabe
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 p-4 md:p-6 overflow-x-auto h-[calc(100%-56px)]">
        {COLUMNS.map((col) => {
          const colAufgaben = aufgaben.filter((a) => a.status === col.key);
          return (
            <div
              key={col.key}
              className={`flex-1 min-w-[280px] max-w-sm rounded-xl border ${col.color} flex flex-col overflow-hidden`}
            >
              {/* Column header */}
              <div className="px-4 py-3 flex items-center gap-2 border-b border-inherit">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <span className="font-semibold text-gray-800 text-sm">
                  {col.label}
                </span>
                <span className="ml-auto bg-white text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                  {colAufgaben.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {colAufgaben.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-400">
                    Keine Aufgaben
                  </div>
                )}
                {colAufgaben.map((aufgabe) => (
                  <AufgabeCard
                    key={aufgabe.id}
                    aufgabe={aufgabe}
                    onClick={() => setSelectedAufgabe(aufgabe)}
                  />
                ))}
              </div>

              {/* Add button per column */}
              <div className="p-3 border-t border-inherit">
                <button
                  onClick={() => setShowNewModal(true)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="text-base leading-none">+</span> Aufgabe
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New task modal */}
      {showNewModal && (
        <NeueAufgabeModal
          onClose={() => setShowNewModal(false)}
          onSave={(a) =>
            setAufgaben((prev) => [a, ...prev])
          }
          familieProfileId={familieProfileId}
          currentUserId={currentUserId}
        />
      )}

      {/* Detail slide-in panel */}
      {selectedAufgabe && (
        <AufgabeDetail
          aufgabe={selectedAufgabe}
          kommentare={kommentare}
          currentUserId={currentUserId}
          onClose={() => setSelectedAufgabe(null)}
          onStatusChange={handleStatusChange}
          onKommentarAdded={handleKommentarAdded}
        />
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
