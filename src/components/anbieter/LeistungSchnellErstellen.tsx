"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { LEISTUNGSKATEGORIEN } from "@/lib/constants";
import type { LeistungsKategorie } from "@/lib/types";

interface Props {
  anbieterId: string;
}

export function LeistungSchnellErstellen({ anbieterId }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kategorie, setKategorie] = useState<LeistungsKategorie>("sonstiges");
  const [preisVon, setPreisVon] = useState("");
  const [preisBis, setPreisBis] = useState("");
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleCancel() {
    setOpen(false);
    setName("");
    setKategorie("sonstiges");
    setPreisVon("");
    setPreisBis("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Bitte geben Sie einen Leistungsnamen ein.");
      return;
    }
    startTransition(async () => {
      const { error } = await supabase.from("leistungen").insert({
        anbieter_id: anbieterId,
        name: name.trim(),
        kategorie,
        preis_von: preisVon ? parseFloat(preisVon) : null,
        preis_bis: preisBis ? parseFloat(preisBis) : null,
        aktiv: true,
      });

      if (error) {
        toast.error("Fehler beim Erstellen: " + error.message);
        return;
      }
      toast.success(`Leistung „${name.trim()}" wurde erstellt.`);
      handleCancel();
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Neue Leistung anlegen
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[--foreground]">Neue Leistung anlegen</p>
        <button
          type="button"
          onClick={handleCancel}
          className="text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          aria-label="Abbrechen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="leistung-name" className="text-xs font-medium">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="leistung-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Grundpflege ambulant"
          className="text-sm"
          maxLength={100}
          autoFocus
        />
      </div>

      {/* Kategorie */}
      <div className="space-y-1">
        <Label htmlFor="leistung-kategorie" className="text-xs font-medium">
          Kategorie
        </Label>
        <select
          id="leistung-kategorie"
          value={kategorie}
          onChange={(e) => setKategorie(e.target.value as LeistungsKategorie)}
          className="w-full rounded-md border border-[--input] bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[--ring]"
        >
          {Object.entries(LEISTUNGSKATEGORIEN).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Preis */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="preis-von" className="text-xs font-medium">
            Preis von (€, optional)
          </Label>
          <Input
            id="preis-von"
            type="number"
            min="0"
            step="0.01"
            value={preisVon}
            onChange={(e) => setPreisVon(e.target.value)}
            placeholder="0.00"
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="preis-bis" className="text-xs font-medium">
            Preis bis (€, optional)
          </Label>
          <Input
            id="preis-bis"
            type="number"
            min="0"
            step="0.01"
            value={preisBis}
            onChange={(e) => setPreisBis(e.target.value)}
            placeholder="0.00"
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Erstellen
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
        >
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
