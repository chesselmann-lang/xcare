"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Trash2, CalendarClock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Wiedervorlage = {
  id: string;
  faellig_am: string;
  notiz: string | null;
  erledigt: boolean;
};

interface WiedervorlageManagerProps {
  anfrageId: string;
  anbieterId: string;
  initial: Wiedervorlage[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(faellig_am: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(faellig_am) < today;
}

export function WiedervorlageManager({
  anfrageId,
  anbieterId,
  initial,
}: WiedervorlageManagerProps) {
  const [items, setItems] = useState<Wiedervorlage[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [faelligAm, setFaelligAm] = useState("");
  const [notiz, setNotiz] = useState("");
  const [saving, startSaving] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  async function handleCreate() {
    if (!faelligAm) {
      toast.error("Bitte ein Datum auswählen.");
      return;
    }
    startSaving(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("wiedervorlagen")
        .insert({
          anfrage_id: anfrageId,
          anbieter_id: anbieterId,
          faellig_am: faelligAm,
          notiz: notiz.trim() || null,
          erledigt: false,
        })
        .select("id, faellig_am, notiz, erledigt")
        .single();

      if (error) {
        toast.error("Fehler beim Speichern.");
        return;
      }

      setItems((prev) =>
        [...prev, data as Wiedervorlage].sort(
          (a, b) => new Date(a.faellig_am).getTime() - new Date(b.faellig_am).getTime()
        )
      );
      setFaelligAm("");
      setNotiz("");
      setShowForm(false);
      toast.success("Wiedervorlage erstellt.");
    });
  }

  async function handleToggle(item: Wiedervorlage) {
    setTogglingId(item.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("wiedervorlagen")
      .update({ erledigt: !item.erledigt })
      .eq("id", item.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren.");
    } else {
      setItems((prev) =>
        prev.map((w) => (w.id === item.id ? { ...w, erledigt: !w.erledigt } : w))
      );
    }
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("wiedervorlagen").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen.");
    } else {
      setItems((prev) => prev.filter((w) => w.id !== id));
      toast.success("Wiedervorlage entfernt.");
    }
    setDeletingId(null);
  }

  const pending = items.filter((w) => !w.erledigt);
  const done = items.filter((w) => w.erledigt);

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((w) => (
            <WiedervorlageItem
              key={w.id}
              item={w}
              onToggle={handleToggle}
              onDelete={handleDelete}
              toggling={togglingId === w.id}
              deleting={deletingId === w.id}
            />
          ))}
        </ul>
      )}

      {pending.length === 0 && !showForm && (
        <p className="text-sm text-[--muted-foreground]">Keine offenen Wiedervorlagen.</p>
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-[--muted-foreground] hover:text-[--foreground] list-none flex items-center gap-1 select-none">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            {done.length} erledigt
          </summary>
          <ul className="mt-2 space-y-2 opacity-60">
            {done.map((w) => (
              <WiedervorlageItem
                key={w.id}
                item={w}
                onToggle={handleToggle}
                onDelete={handleDelete}
                toggling={togglingId === w.id}
                deleting={deletingId === w.id}
              />
            ))}
          </ul>
        </details>
      )}

      {showForm ? (
        <div className="rounded-lg border border-[--border] bg-[--muted]/20 p-3 space-y-2">
          <div>
            <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">
              Fällig am *
            </label>
            <Input
              type="date"
              min={today}
              value={faelligAm}
              onChange={(e) => setFaelligAm(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">
              Notiz (optional)
            </label>
            <Textarea
              rows={2}
              placeholder="z. B. Rückruf bei Familie, Angebot nachfassen…"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              className="text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Speichern
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setFaelligAm("");
                setNotiz("");
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(true)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Wiedervorlage hinzufügen
        </Button>
      )}
    </div>
  );
}

function WiedervorlageItem({
  item,
  onToggle,
  onDelete,
  toggling,
  deleting,
}: {
  item: Wiedervorlage;
  onToggle: (item: Wiedervorlage) => void;
  onDelete: (id: string) => void;
  toggling: boolean;
  deleting: boolean;
}) {
  const overdue = !item.erledigt && isOverdue(item.faellig_am);

  return (
    <li className="flex items-start gap-2.5 group/item">
      <button
        type="button"
        onClick={() => onToggle(item)}
        disabled={toggling || deleting}
        className={cn(
          "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          item.erledigt
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-[--border] hover:border-emerald-400"
        )}
      >
        {toggling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : item.erledigt ? (
          <Check className="h-3 w-3" />
        ) : null}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CalendarClock
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              overdue ? "text-red-500" : "text-[--muted-foreground]"
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              item.erledigt
                ? "line-through text-[--muted-foreground]"
                : overdue
                ? "text-red-600"
                : ""
            )}
          >
            {formatDate(item.faellig_am)}
          </span>
          {overdue && !item.erledigt && (
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
              überfällig
            </span>
          )}
        </div>
        {item.notiz && (
          <p
            className={cn(
              "text-xs text-[--muted-foreground] mt-0.5",
              item.erledigt && "line-through"
            )}
          >
            {item.notiz}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        disabled={toggling || deleting}
        className="opacity-0 group-hover/item:opacity-100 transition-opacity text-[--muted-foreground] hover:text-red-600 mt-0.5"
        aria-label="Löschen"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
}
