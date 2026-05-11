"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Pin, Plus, StickyNote, CheckSquare, Bell, AlertTriangle } from "lucide-react";

interface PinnwandEintrag {
  id: string;
  typ: "notiz" | "aufgabe" | "update" | "wichtig";
  inhalt: string;
  erledigt?: boolean | null;
  erledigt_am?: string | null;
  pinned?: boolean | null;
  erstellt_von_rolle: string;
  created_at: string;
  profiles?: { vorname: string; nachname: string } | null;
}

interface Props {
  eintraege: PinnwandEintrag[];
  isAnbieter: boolean;
  familieProfileId?: string;
}

const TYP_CONFIG = {
  notiz: { label: "Notiz", icon: StickyNote, color: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-100 text-yellow-700", iconColor: "text-yellow-500" },
  aufgabe: { label: "Aufgabe", icon: CheckSquare, color: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700", iconColor: "text-blue-500" },
  update: { label: "Update", icon: Bell, color: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700", iconColor: "text-green-500" },
  wichtig: { label: "Wichtig", icon: AlertTriangle, color: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700", iconColor: "text-red-500" },
};

export default function PinnwandClient({ eintraege: initial, isAnbieter, familieProfileId }: Props) {
  const [eintraege, setEintraege] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"alle" | PinnwandEintrag["typ"]>("alle");
  const [form, setForm] = useState({
    typ: "notiz" as PinnwandEintrag["typ"],
    inhalt: "",
    pinned: false,
  });

  async function handleCreate() {
    if (!form.inhalt.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        ...form,
        ...(isAnbieter && familieProfileId ? { familie_profile_id: familieProfileId } : {}),
      };
      const res = await fetch("/api/pinnwand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry = await res.json();
      setEintraege((prev) => [entry, ...prev]);
      setForm({ typ: "notiz", inhalt: "", pinned: false });
      setShowForm(false);
      setMsg("✓ Erstellt");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  const pinned = eintraege.filter((e) => e.pinned);
  const unpinned = eintraege.filter((e) => !e.pinned);

  const filterEntries = (list: PinnwandEintrag[]) =>
    filter === "alle" ? list : list.filter((e) => e.typ === filter);

  const displayedPinned = filterEntries(pinned);
  const displayedUnpinned = filterEntries(unpinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["alle", "notiz", "aufgabe", "update", "wichtig"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === t
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t === "alle" ? "Alle" : TYP_CONFIG[t].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Neuer Eintrag
        </button>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}

      {/* New Entry Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Neuer Pinnwand-Eintrag</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Typ</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TYP_CONFIG) as PinnwandEintrag["typ"][]).map((t) => {
                  const cfg = TYP_CONFIG[t];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, typ: t }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.typ === t
                          ? `${cfg.badge} border-current`
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Icon size={12} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Inhalt</label>
              <textarea
                rows={3}
                value={form.inhalt}
                onChange={(e) => setForm((f) => ({ ...f, inhalt: e.target.value }))}
                placeholder="Notiz, Aufgabe oder Information..."
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="pinned" checked={form.pinned}
                onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                className="rounded" />
              <label htmlFor="pinned" className="text-sm text-gray-700 flex items-center gap-1">
                <Pin size={12} className="text-gray-500" /> Oben anheften
              </label>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving || !form.inhalt.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "…" : "Erstellen"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned entries */}
      {displayedPinned.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            <Pin size={12} /> Angeheftet
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedPinned.map((e) => <PinnwandCard key={e.id} eintrag={e} />)}
          </div>
        </div>
      )}

      {/* Regular entries */}
      {displayedUnpinned.length > 0 && (
        <div>
          {displayedPinned.length > 0 && (
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Weitere Einträge</div>
          )}
          <div className="space-y-3">
            {displayedUnpinned.map((e) => <PinnwandCard key={e.id} eintrag={e} />)}
          </div>
        </div>
      )}

      {displayedPinned.length === 0 && displayedUnpinned.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Keine Einträge vorhanden
        </div>
      )}
    </div>
  );
}

function PinnwandCard({ eintrag: e }: { eintrag: PinnwandEintrag }) {
  const cfg = TYP_CONFIG[e.typ];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border p-4 ${cfg.color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
          <Icon size={10} />
          {cfg.label}
        </div>
        <div className="flex items-center gap-1.5">
          {e.pinned && <Pin size={12} className="text-gray-400" />}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            e.erstellt_von_rolle === "anbieter"
              ? "bg-purple-100 text-purple-600"
              : "bg-gray-100 text-gray-500"
          }`}>
            {e.erstellt_von_rolle === "anbieter" ? "Anbieter" : "Familie"}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-800 whitespace-pre-wrap">{e.inhalt}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>
          {e.profiles ? `${e.profiles.vorname} ${e.profiles.nachname}` : ""}
        </span>
        <span>{format(parseISO(e.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</span>
      </div>
    </div>
  );
}
