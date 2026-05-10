"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, Trash2, Target, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pflegeziel } from "@/lib/pflegeplan/types";
import {
  PFLEGEZIEL_KATEGORIEN,
  PFLEGEZIEL_PRIORITAET_LABEL,
} from "@/lib/pflegeplan/types";

const PRIORITAET_BADGE: Record<number, string> = {
  1: "bg-red-100 text-red-800 border-red-200",
  2: "bg-yellow-100 text-yellow-800 border-yellow-200",
  3: "bg-green-100 text-green-800 border-green-200",
};

const EMPTY_FORM = {
  titel: "",
  beschreibung: "",
  kategorie: "allgemein",
  prioritaet: "2",
  ziel_datum: "",
};

export function PflegezieleListe() {
  const [ziele, setZiele] = useState<Pflegeziel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    laden();
  }, []);

  async function laden() {
    setLoading(true);
    try {
      const res = await fetch("/api/pflegeziele");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const json = await res.json();
      setZiele(json.data ?? []);
    } catch {
      toast.error("Pflegeziele konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function erstellen() {
    if (!form.titel.trim()) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/pflegeziele", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: form.titel.trim(),
          beschreibung: form.beschreibung.trim() || null,
          kategorie: form.kategorie,
          prioritaet: parseInt(form.prioritaet),
          ziel_datum: form.ziel_datum || null,
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      toast.success("Pflegeziel hinzugefügt");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await laden();
    } catch {
      toast.error("Fehler beim Speichern des Ziels.");
    } finally {
      setSaving(false);
    }
  }

  async function erreichenToggle(ziel: Pflegeziel) {
    try {
      const res = await fetch("/api/pflegeziele", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ziel.id, erreicht: !ziel.erreicht }),
      });
      if (!res.ok) throw new Error();
      toast.success(ziel.erreicht ? "Ziel als offen markiert" : "Ziel als erreicht markiert!");
      setZiele((prev) =>
        prev.map((z) => (z.id === ziel.id ? { ...z, erreicht: !z.erreicht } : z))
      );
    } catch {
      toast.error("Fehler beim Aktualisieren.");
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Dieses Pflegeziel wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/pflegeziele?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Pflegeziel gelöscht");
      setZiele((prev) => prev.filter((z) => z.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  const offeneZiele = ziele.filter((z) => !z.erreicht);
  const erreichtZiele = ziele.filter((z) => z.erreicht);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[--muted] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[--muted-foreground]">
          {offeneZiele.length} offene{offeneZiele.length !== 1 ? " Ziele" : "s Ziel"}
        </p>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Abbrechen
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> Ziel hinzufügen
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="border border-[--border] rounded-xl p-4 space-y-3 bg-[--muted]/30">
          <h3 className="font-medium text-sm text-[--foreground]">Neues Pflegeziel</h3>
          <Input
            placeholder="Titel des Ziels *"
            value={form.titel}
            onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))}
          />
          <Textarea
            placeholder="Beschreibung (optional)"
            value={form.beschreibung}
            onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Kategorie</label>
              <Select
                value={form.kategorie}
                onValueChange={(v) => setForm((f) => ({ ...f, kategorie: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PFLEGEZIEL_KATEGORIEN.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Priorität</label>
              <Select
                value={form.prioritaet}
                onValueChange={(v) => setForm((f) => ({ ...f, prioritaet: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hoch</SelectItem>
                  <SelectItem value="2">Mittel</SelectItem>
                  <SelectItem value="3">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[--muted-foreground] mb-1 block">Zieldatum (optional)</label>
            <Input
              type="date"
              value={form.ziel_datum}
              onChange={(e) => setForm((f) => ({ ...f, ziel_datum: e.target.value }))}
            />
          </div>
          <Button onClick={erstellen} disabled={saving} size="sm" className="w-full">
            {saving ? "Speichern..." : "Ziel speichern"}
          </Button>
        </div>
      )}

      {offeneZiele.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Pflegeziele angelegt.</p>
          <p className="text-xs mt-1">Füge dein erstes Ziel hinzu.</p>
        </div>
      )}

      <div className="space-y-2">
        {offeneZiele.map((ziel) => (
          <ZielKarte key={ziel.id} ziel={ziel} onToggle={erreichenToggle} onDelete={loeschen} />
        ))}
      </div>

      {erreichtZiele.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-[--muted-foreground] flex items-center gap-1 select-none list-none">
            <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
            {erreichtZiele.length} erreichte {erreichtZiele.length === 1 ? "Ziel" : "Ziele"} anzeigen
          </summary>
          <div className="mt-2 space-y-2 opacity-70">
            {erreichtZiele.map((ziel) => (
              <ZielKarte key={ziel.id} ziel={ziel} onToggle={erreichenToggle} onDelete={loeschen} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ZielKarte({
  ziel,
  onToggle,
  onDelete,
}: {
  ziel: Pflegeziel;
  onToggle: (z: Pflegeziel) => void;
  onDelete: (id: string) => void;
}) {
  const prio = ziel.prioritaet as 1 | 2 | 3;
  return (
    <div
      className={`border rounded-xl p-3 flex gap-3 items-start transition-all ${
        ziel.erreicht
          ? "border-[--border] bg-[--muted]/20"
          : "border-[--border] bg-[--background]"
      }`}
    >
      <button
        onClick={() => onToggle(ziel)}
        className="mt-0.5 shrink-0 text-[--muted-foreground] hover:text-[--primary] transition-colors"
        title={ziel.erreicht ? "Als offen markieren" : "Als erreicht markieren"}
      >
        {ziel.erreicht ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              ziel.erreicht ? "line-through text-[--muted-foreground]" : "text-[--foreground]"
            }`}
          >
            {ziel.titel}
          </span>
          <Badge className={`text-xs border ${PRIORITAET_BADGE[prio]}`} variant="outline">
            {PFLEGEZIEL_PRIORITAET_LABEL[prio]}
          </Badge>
        </div>
        {ziel.beschreibung && (
          <p className="text-xs text-[--muted-foreground] mt-0.5 line-clamp-2">
            {ziel.beschreibung}
          </p>
        )}
        <div className="flex gap-2 mt-1 text-xs text-[--muted-foreground]">
          <span className="capitalize">{ziel.kategorie}</span>
          {ziel.ziel_datum && (
            <span>
              · Bis{" "}
              {new Date(ziel.ziel_datum).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(ziel.id)}
        className="shrink-0 text-[--muted-foreground] hover:text-red-600 transition-colors"
        title="Löschen"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
