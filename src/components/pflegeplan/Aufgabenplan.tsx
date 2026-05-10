"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, CheckSquare, Square, Trash2, ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pflegeaufgabe, AufgabeHaeufigkeit } from "@/lib/pflegeplan/types";
import { AUFGABE_HAEUFIGKEIT_LABEL } from "@/lib/pflegeplan/types";

const EMPTY_FORM = {
  titel: "",
  beschreibung: "",
  haeufigkeit: "taeglich" as AufgabeHaeufigkeit,
  uhrzeit: "",
  verantwortlich: "",
};

const HAEUFIGKEIT_ORDER: AufgabeHaeufigkeit[] = [
  "taeglich",
  "woechentlich",
  "monatlich",
  "bei_bedarf",
];

export function Aufgabenplan() {
  const [aufgaben, setAufgaben] = useState<Pflegeaufgabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { laden(); }, []);

  async function laden() {
    setLoading(true);
    try {
      const res = await fetch("/api/pflegeaufgaben");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAufgaben(json.data ?? []);
    } catch {
      toast.error("Aufgaben konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function erstellen() {
    if (!form.titel.trim()) { toast.error("Bitte einen Titel eingeben."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/pflegeaufgaben", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: form.titel.trim(),
          beschreibung: form.beschreibung.trim() || null,
          haeufigkeit: form.haeufigkeit,
          uhrzeit: form.uhrzeit.trim() || null,
          verantwortlich: form.verantwortlich.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Aufgabe hinzugefügt");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await laden();
    } catch {
      toast.error("Fehler beim Speichern der Aufgabe.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleErledigt(aufgabe: Pflegeaufgabe) {
    const neuerWert = !aufgabe.erledigt_heute;
    setAufgaben((prev) =>
      prev.map((a) => (a.id === aufgabe.id ? { ...a, erledigt_heute: neuerWert } : a))
    );
    try {
      const res = await fetch("/api/pflegeaufgaben", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: aufgabe.id, erledigt_heute: neuerWert }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAufgaben((prev) =>
        prev.map((a) => (a.id === aufgabe.id ? { ...a, erledigt_heute: !neuerWert } : a))
      );
      toast.error("Fehler beim Aktualisieren.");
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Diese Aufgabe wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/pflegeaufgaben?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Aufgabe gelöscht");
      setAufgaben((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  const erledigtCount = aufgaben.filter((a) => a.erledigt_heute).length;
  const total = aufgaben.length;

  const gruppen = HAEUFIGKEIT_ORDER.map((haeufigkeit) => ({
    haeufigkeit,
    aufgaben: aufgaben.filter((a) => a.haeufigkeit === haeufigkeit),
  })).filter((g) => g.aufgaben.length > 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-[--muted] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {total > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 w-32 bg-[--muted] rounded-full overflow-hidden">
              <div
                className="h-full bg-[--primary] rounded-full transition-all"
                style={{ width: total > 0 ? `${(erledigtCount / total) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-sm text-[--muted-foreground]">{erledigtCount}/{total} erledigt</p>
          </div>
        ) : (
          <p className="text-sm text-[--muted-foreground]">Keine Aufgaben</p>
        )}
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <><X className="h-4 w-4 mr-1" /> Abbrechen</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" /> Aufgabe hinzufügen</>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="border border-[--border] rounded-xl p-4 space-y-3 bg-[--muted]/30">
          <h3 className="font-medium text-sm">Neue Pflegeaufgabe</h3>
          <Input
            placeholder="Titel der Aufgabe *"
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
              <label className="text-xs text-[--muted-foreground] mb-1 block">Häufigkeit</label>
              <Select
                value={form.haeufigkeit}
                onValueChange={(v) => setForm((f) => ({ ...f, haeufigkeit: v as AufgabeHaeufigkeit }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HAEUFIGKEIT_ORDER.map((h) => (
                    <SelectItem key={h} value={h}>{AUFGABE_HAEUFIGKEIT_LABEL[h]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Uhrzeit (optional)</label>
              <Input
                type="time"
                value={form.uhrzeit}
                onChange={(e) => setForm((f) => ({ ...f, uhrzeit: e.target.value }))}
              />
            </div>
          </div>
          <Input
            placeholder="Verantwortlich (optional)"
            value={form.verantwortlich}
            onChange={(e) => setForm((f) => ({ ...f, verantwortlich: e.target.value }))}
          />
          <Button onClick={erstellen} disabled={saving} size="sm" className="w-full">
            {saving ? "Speichern..." : "Aufgabe speichern"}
          </Button>
        </div>
      )}

      {total === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Aufgaben angelegt.</p>
        </div>
      )}

      {gruppen.map((gruppe) => (
        <div key={gruppe.haeufigkeit} className="space-y-1">
          <h3 className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wider px-1">
            {AUFGABE_HAEUFIGKEIT_LABEL[gruppe.haeufigkeit]}
          </h3>
          <div className="space-y-1.5">
            {gruppe.aufgaben.map((aufgabe) => (
              <div
                key={aufgabe.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  aufgabe.erledigt_heute
                    ? "border-green-200 bg-green-50 dark:bg-green-900/10"
                    : "border-[--border] bg-[--background]"
                }`}
              >
                <button
                  onClick={() => toggleErledigt(aufgabe)}
                  className="shrink-0 text-[--muted-foreground] hover:text-green-600 transition-colors"
                >
                  {aufgabe.erledigt_heute ? (
                    <CheckSquare className="h-5 w-5 text-green-600" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      aufgabe.erledigt_heute
                        ? "line-through text-[--muted-foreground]"
                        : "text-[--foreground]"
                    }`}
                  >
                    {aufgabe.titel}
                  </p>
                  <div className="flex gap-2 text-xs text-[--muted-foreground] mt-0.5">
                    {aufgabe.uhrzeit && <span>{aufgabe.uhrzeit} Uhr</span>}
                    {aufgabe.verantwortlich && <span>· {aufgabe.verantwortlich}</span>}
                    {aufgabe.beschreibung && (
                      <span className="truncate">· {aufgabe.beschreibung}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => loeschen(aufgabe.id)}
                  className="shrink-0 text-[--muted-foreground] hover:text-red-600 transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
