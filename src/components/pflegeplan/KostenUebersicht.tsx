"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2, TrendingDown, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pflegekosten, KostenKategorie } from "@/lib/pflegeplan/types";
import { KOSTEN_KATEGORIE_LABEL, KOSTEN_KATEGORIE_COLOR } from "@/lib/pflegeplan/types";

const KATEGORIEN = Object.keys(KOSTEN_KATEGORIE_LABEL) as KostenKategorie[];

const EMPTY_FORM = {
  buchungsdatum: new Date().toISOString().split("T")[0],
  betrag: "",
  kategorie: "sonstiges" as KostenKategorie,
  beschreibung: "",
  belegnummer: "",
  erstattung: "",
};

function euroFormat(val: number) {
  return val.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

type KategorieGruppe = {
  kategorie: KostenKategorie;
  eintraege: Pflegekosten[];
  summe: number;
  erstattungen: number;
};

export function KostenUebersicht() {
  const [kosten, setKosten] = useState<Pflegekosten[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const heute = new Date();
  const [monat, setMonat] = useState(
    `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`
  );

  useEffect(() => { laden(); }, [monat]);

  async function laden() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pflegekosten?monat=${monat}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setKosten(json.data ?? []);
    } catch {
      toast.error("Kosten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function erstellen() {
    const betrag = parseFloat(form.betrag.replace(",", "."));
    if (!form.beschreibung.trim() || isNaN(betrag) || betrag <= 0) {
      toast.error("Beschreibung und gültiger Betrag sind erforderlich.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/pflegekosten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buchungsdatum: form.buchungsdatum,
          betrag,
          kategorie: form.kategorie,
          beschreibung: form.beschreibung.trim(),
          belegnummer: form.belegnummer.trim() || null,
          erstattung: parseFloat(form.erstattung.replace(",", ".")) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kosteneintrag gespeichert");
      setShowForm(false);
      setForm({ ...EMPTY_FORM, buchungsdatum: new Date().toISOString().split("T")[0] });
      await laden();
    } catch {
      toast.error("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/pflegekosten?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Eintrag gelöscht");
      setKosten((prev) => prev.filter((k) => k.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  const gesamtBrutto = kosten.reduce((s, k) => s + Number(k.betrag), 0);
  const gesamtErstattung = kosten.reduce((s, k) => s + Number(k.erstattung), 0);
  const gesamtNetto = gesamtBrutto - gesamtErstattung;

  const kategorieGruppen: KategorieGruppe[] = KATEGORIEN.map((kat) => {
    const eintraege = kosten.filter((k) => k.kategorie === kat);
    return {
      kategorie: kat,
      eintraege,
      summe: eintraege.reduce((s, k) => s + Number(k.betrag), 0),
      erstattungen: eintraege.reduce((s, k) => s + Number(k.erstattung), 0),
    };
  })
    .filter((g) => g.eintraege.length > 0)
    .sort((a, b) => b.summe - a.summe);

  const maxSumme = Math.max(...kategorieGruppen.map((g) => g.summe), 1);

  const monatLabel = new Date(`${monat}-01`).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[--muted] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={monat}
            onChange={(e) => setMonat(e.target.value)}
            className="w-40"
          />
          <span className="text-sm text-[--muted-foreground] hidden sm:inline">{monatLabel}</span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <><X className="h-4 w-4 mr-1" /> Abbrechen</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" /> Ausgabe erfassen</>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="border border-[--border] rounded-xl p-4 space-y-3 bg-[--muted]/30">
          <h3 className="font-medium text-sm">Neue Ausgabe</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Datum</label>
              <Input
                type="date"
                value={form.buchungsdatum}
                onChange={(e) => setForm((f) => ({ ...f, buchungsdatum: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Betrag (€) *</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.betrag}
                onChange={(e) => setForm((f) => ({ ...f, betrag: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[--muted-foreground] mb-1 block">Kategorie</label>
            <Select
              value={form.kategorie}
              onValueChange={(v) => setForm((f) => ({ ...f, kategorie: v as KostenKategorie }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KATEGORIEN.map((k) => (
                  <SelectItem key={k} value={k}>{KOSTEN_KATEGORIE_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Beschreibung *"
            value={form.beschreibung}
            onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Belegnummer (optional)"
              value={form.belegnummer}
              onChange={(e) => setForm((f) => ({ ...f, belegnummer: e.target.value }))}
            />
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Erstattung (€)"
              value={form.erstattung}
              onChange={(e) => setForm((f) => ({ ...f, erstattung: e.target.value }))}
            />
          </div>
          <Button onClick={erstellen} disabled={saving} size="sm" className="w-full">
            {saving ? "Speichern..." : "Ausgabe speichern"}
          </Button>
        </div>
      )}

      {kosten.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-[--border] rounded-xl p-3 text-center">
            <p className="text-xs text-[--muted-foreground]">Ausgaben</p>
            <p className="text-lg font-bold text-[--foreground]">{euroFormat(gesamtBrutto)}</p>
          </div>
          <div className="border border-green-200 rounded-xl p-3 text-center bg-green-50 dark:bg-green-900/10">
            <p className="text-xs text-green-700">Erstattungen</p>
            <p className="text-lg font-bold text-green-700">{euroFormat(gesamtErstattung)}</p>
          </div>
          <div className="border border-[--primary]/30 rounded-xl p-3 text-center bg-[--primary]/5">
            <p className="text-xs text-[--primary]">Eigenanteil</p>
            <p className="text-lg font-bold text-[--primary]">{euroFormat(gesamtNetto)}</p>
          </div>
        </div>
      )}

      {kosten.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <ReceiptText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Ausgaben für {monatLabel}.</p>
        </div>
      )}

      {kategorieGruppen.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wider">
            Nach Kategorie
          </h3>
          {kategorieGruppen.map((gruppe) => (
            <div key={gruppe.kategorie} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[--foreground] font-medium">
                  {KOSTEN_KATEGORIE_LABEL[gruppe.kategorie]}
                </span>
                <span className="text-[--muted-foreground]">{euroFormat(gruppe.summe)}</span>
              </div>
              <div className="h-2.5 bg-[--muted] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(gruppe.summe / maxSumme) * 100}%`,
                    backgroundColor: KOSTEN_KATEGORIE_COLOR[gruppe.kategorie],
                  }}
                />
              </div>
              {gruppe.erstattungen > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {euroFormat(gruppe.erstattungen)} erstattet
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {kosten.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wider">
            Buchungen
          </h3>
          {kosten.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-3 p-2.5 border border-[--border] rounded-xl bg-[--background]"
            >
              <div
                className="w-2 h-10 rounded-full shrink-0"
                style={{ backgroundColor: KOSTEN_KATEGORIE_COLOR[k.kategorie] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[--foreground] truncate">{k.beschreibung}</p>
                <div className="flex gap-2 text-xs text-[--muted-foreground]">
                  <span>
                    {new Date(k.buchungsdatum).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <Badge variant="outline" className="text-xs py-0">
                    {KOSTEN_KATEGORIE_LABEL[k.kategorie]}
                  </Badge>
                  {k.belegnummer && <span>Nr. {k.belegnummer}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-[--foreground]">
                  {euroFormat(Number(k.betrag))}
                </p>
                {Number(k.erstattung) > 0 && (
                  <p className="text-xs text-green-600">-{euroFormat(Number(k.erstattung))}</p>
                )}
              </div>
              <button
                onClick={() => loeschen(k.id)}
                className="text-[--muted-foreground] hover:text-red-600 transition-colors shrink-0"
                title="Löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
