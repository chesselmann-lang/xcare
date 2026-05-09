"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, BellRing, Check, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Wiedervorlage {
  id: string;
  faellig_am: string;
  notiz: string | null;
  erledigt: boolean;
}

interface Props {
  anfrageId: string;
  anbieterId: string;
  initial: Wiedervorlage[];
}

export function WiedervorlageManager({ anfrageId, anbieterId, initial }: Props) {
  const [items, setItems] = useState<Wiedervorlage[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [faelligAm, setFaelligAm] = useState("");
  const [notiz, setNotiz] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  // Today's date as min for datepicker
  const today = new Date().toISOString().split("T")[0];

  async function handleAdd() {
    if (!faelligAm) {
      toast.error("Bitte ein Datum wählen.");
      return;
    }
    startTransition(async () => {
      const { data, error } = await supabase
        .from("wiedervorlagen")
        .insert({
          anfrage_id: anfrageId,
          anbieter_id: anbieterId,
          faellig_am: faelligAm,
          notiz: notiz.trim() || null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Fehler beim Speichern.");
        return;
      }
      setItems((prev) => [...prev, data]);
      setFaelligAm("");
      setNotiz("");
      setShowForm(false);
      toast.success("Wiedervorlage gespeichert.");
    });
  }

  async function handleToggle(id: string, current: boolean) {
    const { error } = await supabase
      .from("wiedervorlagen")
      .update({ erledigt: !current })
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Aktualisieren.");
      return;
    }
    setItems((prev) =>
      prev.map((w) => (w.id === id ? { ...w, erledigt: !current } : w))
    );
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase
      .from("wiedervorlagen")
      .delete()
      .eq("id", id);

    setDeletingId(null);
    if (error) {
      toast.error("Fehler beim Löschen.");
      return;
    }
    setItems((prev) => prev.filter((w) => w.id !== id));
    toast.success("Wiedervorlage gelöscht.");
  }

  const open = items.filter((w) => !w.erledigt);
  const done = items.filter((w) => w.erledigt);

  return (
    <div className="space-y-3">
      {/* Open items */}
      {open.length === 0 && !showForm && (
        <p className="text-sm text-gray-400">Keine offenen Wiedervorlagen.</p>
      )}
      {open.map((w) => {
        const isOverdue = w.faellig_am < today;
        return (
          <div
            key={w.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              isOverdue
                ? "bg-red-50 border-red-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <BellRing
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                isOverdue ? "text-red-500" : "text-amber-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isOverdue ? "text-red-700" : "text-amber-700"}`}>
                {new Date(w.faellig_am).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
                {isOverdue && (
                  <span className="ml-2 text-xs font-normal text-red-500">
                    überfällig
                  </span>
                )}
              </p>
              {w.notiz && (
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{w.notiz}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:bg-green-100"
                onClick={() => handleToggle(w.id, false)}
                title="Als erledigt markieren"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                onClick={() => handleDelete(w.id)}
                disabled={deletingId === w.id}
              >
                {deletingId === w.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        );
      })}

      {/* Add form */}
      {showForm ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex gap-2">
            <Input
              type="date"
              min={today}
              value={faelligAm}
              onChange={(e) => setFaelligAm(e.target.value)}
              className="text-sm h-8 w-auto"
            />
          </div>
          <Input
            placeholder="Notiz (optional)"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            className="text-sm h-8"
            maxLength={200}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleAdd}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              Speichern
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
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
          className="gap-1.5 h-7 text-xs w-full border-dashed"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Wiedervorlage hinzufügen
        </Button>
      )}

      {/* Done items (collapsed) */}
      {done.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
            <Bell className="h-3 w-3" /> {done.length} erledigt
          </p>
          {done.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-2 py-1 opacity-50"
            >
              <Check className="h-3 w-3 text-green-500 shrink-0" />
              <p className="text-xs text-gray-500 line-through flex-1">
                {new Date(w.faellig_am).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
                {w.notiz && ` – ${w.notiz}`}
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-gray-300 hover:text-red-400"
                onClick={() => handleDelete(w.id)}
                disabled={deletingId === w.id}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
