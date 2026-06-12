"use client";

import { useState, useTransition } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Pin, PinOff, Plus, StickyNote, CheckSquare, Bell, AlertTriangle,
  Trash2, CheckCircle2, Circle, X, Loader2
} from "lucide-react";
import { toast } from "sonner";

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

const TYP_CONFIG: Record<PinnwandEintrag["typ"], {
  label: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  iconColor: string;
}> = {
  notiz:   { label: "Notiz",    icon: StickyNote,    color: "bg-yellow-50 border-yellow-200",  badge: "bg-yellow-100 text-yellow-700",  iconColor: "text-yellow-600" },
  aufgabe: { label: "Aufgabe",  icon: CheckSquare,   color: "bg-blue-50 border-blue-200",      badge: "bg-blue-100 text-blue-700",      iconColor: "text-blue-600"   },
  update:  { label: "Update",   icon: Bell,          color: "bg-green-50 border-green-200",    badge: "bg-green-100 text-green-700",    iconColor: "text-green-600"  },
  wichtig: { label: "Wichtig",  icon: AlertTriangle, color: "bg-red-50 border-red-200",        badge: "bg-red-100 text-red-700",        iconColor: "text-red-600"    },
};

export default function PinnwandClient({ eintraege: initial, isAnbieter, familieProfileId }: Props) {
  const [eintraege, setEintraege] = useState<PinnwandEintrag[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"alle" | PinnwandEintrag["typ"] | "offen">("alle");
  const [form, setForm] = useState<{ typ: PinnwandEintrag["typ"]; inhalt: string; pinned: boolean }>({
    typ: "notiz", inhalt: "", pinned: false,
  });
  const [, startTransition] = useTransition();

  async function handleCreate() {
    if (!form.inhalt.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (isAnbieter && familieProfileId) body.familie_profile_id = familieProfileId;
      const res = await fetch("/api/pinnwand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry: PinnwandEintrag = await res.json();
      setEintraege((prev) => [{ ...entry, erstellt_von_rolle: isAnbieter ? "anbieter" : "familie" }, ...prev]);
      setForm({ typ: "notiz", inhalt: "", pinned: false });
      setShowForm(false);
      toast.success("Eintrag erstellt");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePin(id: string, currentPinned: boolean) {
    startTransition(() => {
      setEintraege((prev) =>
        prev.map((e) => e.id === id ? { ...e, pinned: !currentPinned } : e)
      );
    });
    const res = await fetch(`/api/pinnwand/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !currentPinned }),
    });
    if (!res.ok) {
      setEintraege((prev) =>
        prev.map((e) => e.id === id ? { ...e, pinned: currentPinned } : e)
      );
      toast.error("Fehler beim Aktualisieren");
    }
  }

  async function handleToggleDone(id: string, currentDone: boolean) {
    startTransition(() => {
      setEintraege((prev) =>
        prev.map((e) => e.id === id ? { ...e, erledigt: !currentDone } : e)
      );
    });
    const res = await fetch(`/api/pinnwand/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ erledigt: !currentDone }),
    });
    if (!res.ok) {
      setEintraege((prev) =>
        prev.map((e) => e.id === id ? { ...e, erledigt: currentDone } : e)
      );
      toast.error("Fehler beim Aktualisieren");
    } else {
      toast.success(!currentDone ? "Als erledigt markiert" : "Als offen markiert");
    }
  }

  async function handleDelete(id: string) {
    startTransition(() => {
      setEintraege((prev) => prev.filter((e) => e.id !== id));
    });
    const res = await fetch(`/api/pinnwand/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Eintrag gelöscht");
    }
  }

  const applyFilter = (list: PinnwandEintrag[]) => {
    if (filter === "alle") return list;
    if (filter === "offen") return list.filter((e) => e.typ === "aufgabe" && !e.erledigt);
    return list.filter((e) => e.typ === filter);
  };

  const pinned = applyFilter(eintraege.filter((e) => e.pinned));
  const unpinned = applyFilter(eintraege.filter((e) => !e.pinned));
  const empty = pinned.length === 0 && unpinned.length === 0;
  const offeneAufgaben = eintraege.filter((e) => e.typ === "aufgabe" && !e.erledigt).length;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["alle", "notiz", "aufgabe", "update", "wichtig", "offen"] as const).map((t) => {
            const label =
              t === "alle" ? "Alle" :
              t === "offen" ? `Offen (${offeneAufgaben})` :
              TYP_CONFIG[t as PinnwandEintrag["typ"]].label;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === t
                    ? "bg-[--primary] text-white"
                    : "bg-[--muted] text-[--muted-foreground] hover:bg-[--border]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Abbrechen" : "Neuer Eintrag"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-[--card] border border-[--border] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-[--foreground] mb-4">Neuer Pinnwand-Eintrag</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-[--muted-foreground] mb-2">Typ</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TYP_CONFIG) as [PinnwandEintrag["typ"], typeof TYP_CONFIG["notiz"]][]).map(([t, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, typ: t }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.typ === t
                          ? `${cfg.badge} border-current`
                          : "border-[--border] text-[--muted-foreground] hover:border-[--primary]/40"
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
              <label className="text-xs font-medium text-[--muted-foreground]">Inhalt</label>
              <textarea
                rows={3}
                value={form.inhalt}
                onChange={(e) => setForm((f) => ({ ...f, inhalt: e.target.value }))}
                placeholder={form.typ === "aufgabe" ? "Aufgabe beschreiben…" : "Notiz oder Information eingeben…"}
                className="mt-1 w-full border border-[--border] rounded-xl px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40 resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-[--muted-foreground] mt-1 text-right">{form.inhalt.length}/2000</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                className="rounded accent-[--primary]"
              />
              <span className="text-sm text-[--foreground] flex items-center gap-1">
                <Pin size={13} className="text-[--muted-foreground]" />
                Oben anheften
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={saving || !form.inhalt.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[--primary] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Erstellen
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2 bg-[--muted] text-[--muted-foreground] rounded-xl text-sm hover:bg-[--border] transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-xs font-semibold text-[--muted-foreground] uppercase tracking-wider mb-3">
            <Pin size={12} className="text-amber-500" />
            Angeheftet
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pinned.map((e) => (
              <PinnwandCard
                key={e.id}
                eintrag={e}
                onTogglePin={handleTogglePin}
                onToggleDone={handleToggleDone}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Regular section */}
      {unpinned.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wider mb-3">
              Weitere Einträge
            </div>
          )}
          <div className="space-y-3">
            {unpinned.map((e) => (
              <PinnwandCard
                key={e.id}
                eintrag={e}
                onTogglePin={handleTogglePin}
                onToggleDone={handleToggleDone}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {empty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[--muted] flex items-center justify-center mb-4">
            <StickyNote size={28} className="text-[--muted-foreground]" />
          </div>
          <p className="text-[--foreground] font-medium">Noch keine Einträge</p>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Erstellen Sie Notizen, Aufgaben oder Updates für das Care-Team.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-xl text-sm font-medium hover:opacity-90"
          >
            <Plus size={15} /> Ersten Eintrag erstellen
          </button>
        </div>
      )}
    </div>
  );
}

function PinnwandCard({
  eintrag: e,
  onTogglePin,
  onToggleDone,
  onDelete,
}: {
  eintrag: PinnwandEintrag;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = TYP_CONFIG[e.typ];
  const Icon = cfg.icon;
  const done = !!e.erledigt;

  return (
    <div className={`rounded-2xl border p-4 transition-opacity ${cfg.color} ${done ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
          <Icon size={10} />
          {cfg.label}
        </span>
        <div className="flex items-center gap-1">
          {e.typ === "aufgabe" && (
            <button
              onClick={() => onToggleDone(e.id, done)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
              title={done ? "Als offen markieren" : "Als erledigt markieren"}
              aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
            >
              {done
                ? <CheckCircle2 size={15} className="text-green-600" />
                : <Circle size={15} className="text-gray-400" />
              }
            </button>
          )}
          <button
            onClick={() => onTogglePin(e.id, !!e.pinned)}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            title={e.pinned ? "Anheftung entfernen" : "Anheften"}
            aria-label={e.pinned ? "Anheftung entfernen" : "Anheften"}
          >
            {e.pinned
              ? <PinOff size={13} className="text-amber-500" />
              : <Pin size={13} className="text-gray-400" />
            }
          </button>
          <button
            onClick={() => onDelete(e.id)}
            className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
            title="Löschen"
            aria-label="Eintrag löschen"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <p className={`mt-3 text-sm whitespace-pre-wrap text-gray-800 ${done ? "line-through text-gray-400" : ""}`}>
        {e.inhalt}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
            e.erstellt_von_rolle === "anbieter"
              ? "bg-purple-100 text-purple-600"
              : "bg-gray-100 text-gray-500"
          }`}>
            {e.erstellt_von_rolle === "anbieter" ? "Anbieter" : "Familie"}
          </span>
          {e.profiles && (
            <span>{e.profiles.vorname} {e.profiles.nachname}</span>
          )}
        </div>
        <time
          dateTime={e.created_at}
          title={format(parseISO(e.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
          className="tabular-nums"
        >
          {formatDistanceToNow(parseISO(e.created_at), { addSuffix: true, locale: de })}
        </time>
      </div>

      {done && e.erledigt_am && (
        <p className="mt-1 text-[10px] text-green-600">
          Erledigt {format(parseISO(e.erledigt_am), "dd.MM.yy HH:mm", { locale: de })}
        </p>
      )}
    </div>
  );
}
