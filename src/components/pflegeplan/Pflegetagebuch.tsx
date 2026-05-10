"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, BookOpen, X, Moon, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { Pflegetagebucheintrag } from "@/lib/pflegeplan/types";
import { STIMMUNG_EMOJI, STIMMUNG_LABEL } from "@/lib/pflegeplan/types";

const EMPTY_FORM = {
  eintrag_datum: new Date().toISOString().split("T")[0],
  stimmung: "" as string,
  schlaf_stunden: "",
  schmerzen: "" as string,
  aktivitaeten: "",
  notizen: "",
  erstellt_von: "",
};

function SchmerzBalken({ wert }: { wert: number }) {
  const farbe =
    wert <= 2 ? "bg-green-500" :
    wert <= 4 ? "bg-yellow-400" :
    wert <= 6 ? "bg-orange-400" :
    "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[--muted] rounded-full overflow-hidden max-w-[120px]">
        <div
          className={`h-full rounded-full transition-all ${farbe}`}
          style={{ width: `${(wert / 10) * 100}%` }}
        />
      </div>
      <span className="text-xs text-[--muted-foreground] w-4">{wert}</span>
    </div>
  );
}

export function Pflegetagebuch() {
  const [eintraege, setEintraege] = useState<Pflegetagebucheintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { laden(); }, []);

  async function laden() {
    setLoading(true);
    try {
      const res = await fetch("/api/pflegetagebuch");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setEintraege(json.data ?? []);
    } catch {
      toast.error("Tagebucheinträge konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function erstellen() {
    setSaving(true);
    try {
      const res = await fetch("/api/pflegetagebuch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eintrag_datum: form.eintrag_datum,
          stimmung: form.stimmung ? parseInt(form.stimmung) : null,
          schlaf_stunden: form.schlaf_stunden ? parseFloat(form.schlaf_stunden) : null,
          schmerzen: form.schmerzen !== "" ? parseInt(form.schmerzen) : null,
          aktivitaeten: form.aktivitaeten.trim() || null,
          notizen: form.notizen.trim() || null,
          erstellt_von: form.erstellt_von.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Eintrag gespeichert");
      setShowForm(false);
      setForm({ ...EMPTY_FORM, eintrag_datum: new Date().toISOString().split("T")[0] });
      await laden();
    } catch {
      toast.error("Fehler beim Speichern des Eintrags.");
    } finally {
      setSaving(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/pflegetagebuch?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Eintrag gelöscht");
      setEintraege((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[--muted] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[--muted-foreground]">
          {eintraege.length} {eintraege.length === 1 ? "Eintrag" : "Einträge"} (letzte 30 Tage)
        </p>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <><X className="h-4 w-4 mr-1" /> Abbrechen</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" /> Eintrag hinzufügen</>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="border border-[--border] rounded-xl p-4 space-y-4 bg-[--muted]/30">
          <h3 className="font-medium text-sm">Neuer Tagebucheintrag</h3>

          <div>
            <label className="text-xs text-[--muted-foreground] mb-1 block">Datum</label>
            <Input
              type="date"
              value={form.eintrag_datum}
              onChange={(e) => setForm((f) => ({ ...f, eintrag_datum: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs text-[--muted-foreground] mb-2 block">Stimmung</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((wert) => (
                <button
                  key={wert}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      stimmung: f.stimmung === String(wert) ? "" : String(wert),
                    }))
                  }
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                    form.stimmung === String(wert)
                      ? "border-[--primary] bg-[--primary]/10"
                      : "border-[--border] hover:border-[--primary]/50"
                  }`}
                  title={STIMMUNG_LABEL[wert]}
                >
                  <span className="text-2xl">{STIMMUNG_EMOJI[wert]}</span>
                  <span className="text-xs text-[--muted-foreground] mt-0.5">
                    {STIMMUNG_LABEL[wert].split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Schlaf (Stunden)</label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                placeholder="z.B. 7.5"
                value={form.schlaf_stunden}
                onChange={(e) => setForm((f) => ({ ...f, schlaf_stunden: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Schmerzen (0-10)</label>
              <Input
                type="number"
                min={0}
                max={10}
                step={1}
                placeholder="0 = kein Schmerz"
                value={form.schmerzen}
                onChange={(e) => setForm((f) => ({ ...f, schmerzen: e.target.value }))}
              />
            </div>
          </div>

          <Textarea
            placeholder="Aktivitäten (optional)"
            value={form.aktivitaeten}
            onChange={(e) => setForm((f) => ({ ...f, aktivitaeten: e.target.value }))}
            rows={2}
          />
          <Textarea
            placeholder="Notizen und Beobachtungen"
            value={form.notizen}
            onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
            rows={3}
          />
          <Input
            placeholder="Erstellt von (optional)"
            value={form.erstellt_von}
            onChange={(e) => setForm((f) => ({ ...f, erstellt_von: e.target.value }))}
          />
          <Button onClick={erstellen} disabled={saving} size="sm" className="w-full">
            {saving ? "Speichern..." : "Eintrag speichern"}
          </Button>
        </div>
      )}

      {eintraege.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Tagebucheinträge.</p>
        </div>
      )}

      <div className="relative space-y-0">
        {eintraege.map((eintrag, index) => {
          const datum = new Date(eintrag.eintrag_datum);
          return (
            <div key={eintrag.id} className="flex gap-4 relative">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[--primary] shrink-0 mt-4 z-10" />
                {index < eintraege.length - 1 && (
                  <div className="w-px flex-1 bg-[--border] mt-1" />
                )}
              </div>

              <div className="flex-1 pb-4">
                <div className="border border-[--border] rounded-xl p-3 bg-[--background]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-sm text-[--foreground]">
                        {datum.toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {eintrag.erstellt_von && (
                        <p className="text-xs text-[--muted-foreground]">
                          von {eintrag.erstellt_von}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => loeschen(eintrag.id)}
                      className="text-[--muted-foreground] hover:text-red-600 transition-colors shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-2">
                    {eintrag.stimmung !== null && (
                      <div className="flex items-center gap-1">
                        <span className="text-xl">{STIMMUNG_EMOJI[eintrag.stimmung]}</span>
                        <span className="text-xs text-[--muted-foreground]">
                          {STIMMUNG_LABEL[eintrag.stimmung]}
                        </span>
                      </div>
                    )}
                    {eintrag.schlaf_stunden !== null && (
                      <div className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                        <Moon className="h-3.5 w-3.5" />
                        {eintrag.schlaf_stunden}h Schlaf
                      </div>
                    )}
                    {eintrag.schmerzen !== null && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-[--muted-foreground]" />
                        <SchmerzBalken wert={eintrag.schmerzen} />
                      </div>
                    )}
                  </div>

                  {eintrag.aktivitaeten && (
                    <p className="text-xs text-[--muted-foreground] mb-1">
                      <span className="font-medium">Aktivitäten:</span> {eintrag.aktivitaeten}
                    </p>
                  )}
                  {eintrag.notizen && (
                    <p className="text-sm text-[--foreground] whitespace-pre-wrap">
                      {eintrag.notizen}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
