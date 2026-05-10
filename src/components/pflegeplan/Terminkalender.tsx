"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, CalendarDays, X, MapPin, Clock, CheckCircle2, Trash2 } from "lucide-react";
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
import type { Pflegetermin, TerminTyp } from "@/lib/pflegeplan/types";
import { TERMIN_TYP_LABEL, TERMIN_TYP_COLOR } from "@/lib/pflegeplan/types";

const TERMIN_TYPEN: TerminTyp[] = ["arzt", "therapie", "behoerde", "pflege", "sonstiges"];

const EMPTY_FORM = {
  titel: "",
  beschreibung: "",
  termin_typ: "arzt" as TerminTyp,
  datum: "",
  uhrzeit: "",
  dauer_minuten: "60",
  ort: "",
  notizen: "",
};

export function Terminkalender() {
  const [termine, setTermine] = useState<Pflegetermin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { laden(); }, []);

  async function laden() {
    setLoading(true);
    try {
      const res = await fetch("/api/pflegeplan");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTermine(json.data ?? []);
    } catch {
      toast.error("Termine konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function erstellen() {
    if (!form.titel.trim() || !form.datum) {
      toast.error("Titel und Datum sind erforderlich.");
      return;
    }
    setSaving(true);
    try {
      const datumMitZeit = form.uhrzeit
        ? `${form.datum}T${form.uhrzeit}:00`
        : `${form.datum}T09:00:00`;

      const res = await fetch("/api/pflegeplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: form.titel.trim(),
          beschreibung: form.beschreibung.trim() || null,
          termin_typ: form.termin_typ,
          datum: datumMitZeit,
          dauer_minuten: parseInt(form.dauer_minuten) || 60,
          ort: form.ort.trim() || null,
          notizen: form.notizen.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Termin hinzugefügt");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await laden();
    } catch {
      toast.error("Fehler beim Speichern des Termins.");
    } finally {
      setSaving(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Diesen Termin wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/pflegeplan?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Termin gelöscht");
      setTermine((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[--muted] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[--muted-foreground]">
          {termine.length} {termine.length === 1 ? "Termin" : "Termine"} in den nächsten 7 Tagen
        </p>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <><X className="h-4 w-4 mr-1" /> Abbrechen</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" /> Termin hinzufügen</>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="border border-[--border] rounded-xl p-4 space-y-3 bg-[--muted]/30">
          <h3 className="font-medium text-sm">Neuer Termin</h3>
          <Input
            placeholder="Titel *"
            value={form.titel}
            onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Terminart</label>
              <Select
                value={form.termin_typ}
                onValueChange={(v) => setForm((f) => ({ ...f, termin_typ: v as TerminTyp }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMIN_TYPEN.map((t) => (
                    <SelectItem key={t} value={t}>{TERMIN_TYP_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Datum *</label>
              <Input
                type="date"
                value={form.datum}
                onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Uhrzeit</label>
              <Input
                type="time"
                value={form.uhrzeit}
                onChange={(e) => setForm((f) => ({ ...f, uhrzeit: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Dauer (Minuten)</label>
              <Input
                type="number"
                min={15}
                step={15}
                value={form.dauer_minuten}
                onChange={(e) => setForm((f) => ({ ...f, dauer_minuten: e.target.value }))}
              />
            </div>
          </div>
          <Input
            placeholder="Ort (optional)"
            value={form.ort}
            onChange={(e) => setForm((f) => ({ ...f, ort: e.target.value }))}
          />
          <Textarea
            placeholder="Notizen (optional)"
            value={form.notizen}
            onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
            rows={2}
          />
          <Button onClick={erstellen} disabled={saving} size="sm" className="w-full">
            {saving ? "Speichern..." : "Termin speichern"}
          </Button>
        </div>
      )}

      {termine.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Termine in den nächsten 7 Tagen.</p>
        </div>
      )}

      <div className="space-y-2">
        {termine.map((termin) => {
          const datum = new Date(termin.datum);
          const heute = new Date();
          const istHeute = datum.toDateString() === heute.toDateString();
          const istVergangen = datum < heute;

          return (
            <div
              key={termin.id}
              className={`border rounded-xl p-3 flex gap-3 items-start transition-all ${
                istVergangen && !istHeute
                  ? "border-[--border] bg-[--muted]/20 opacity-60"
                  : istHeute
                  ? "border-[--primary]/30 bg-[--primary]/5"
                  : "border-[--border] bg-[--background]"
              }`}
            >
              <div className="shrink-0 text-center min-w-[44px]">
                <p className="text-xs font-bold text-[--muted-foreground] uppercase">
                  {datum.toLocaleDateString("de-DE", { weekday: "short" })}
                </p>
                <p className="text-xl font-bold text-[--foreground] leading-tight">
                  {datum.getDate()}
                </p>
                <p className="text-xs text-[--muted-foreground]">
                  {datum.toLocaleDateString("de-DE", { month: "short" })}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-medium text-[--foreground]">{termin.titel}</span>
                  <Badge
                    className={`text-xs border ${TERMIN_TYP_COLOR[termin.termin_typ]}`}
                    variant="outline"
                  >
                    {TERMIN_TYP_LABEL[termin.termin_typ]}
                  </Badge>
                  {istHeute && (
                    <Badge className="text-xs bg-[--primary] text-white border-0">Heute</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-[--muted-foreground]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {datum.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                    {termin.dauer_minuten && ` (${termin.dauer_minuten} Min.)`}
                  </span>
                  {termin.ort && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {termin.ort}
                    </span>
                  )}
                </div>
                {termin.notizen && (
                  <p className="text-xs text-[--muted-foreground] mt-1 line-clamp-1">
                    {termin.notizen}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {termin.erledigt && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" title="Erledigt" />
                )}
                <button
                  onClick={() => loeschen(termin.id)}
                  className="text-[--muted-foreground] hover:text-red-600 transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
