"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus, Phone, Mail, MapPin, Star, Trash2, Pencil, X, Users,
} from "lucide-react";
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
import type { Notfallkontakt, Beziehung } from "@/lib/pflegeplan/types";
import { BEZIEHUNG_LABEL } from "@/lib/pflegeplan/types";

const BEZIEHUNGEN = Object.keys(BEZIEHUNG_LABEL) as Beziehung[];

const EMPTY_FORM = {
  name: "",
  beziehung: "sonstiges" as Beziehung,
  telefon: "",
  email: "",
  adresse: "",
  ist_hauptkontakt: false,
};

export function Notfallkontakte() {
  const [kontakte, setKontakte] = useState<Notfallkontakt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { laden(); }, []);

  async function laden() {
    setLoading(true);
    try {
      const res = await fetch("/api/notfallkontakte");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setKontakte(json.data ?? []);
    } catch {
      toast.error("Kontakte konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  function editieren(kontakt: Notfallkontakt) {
    setEditId(kontakt.id);
    setForm({
      name: kontakt.name,
      beziehung: (kontakt.beziehung as Beziehung) ?? "sonstiges",
      telefon: kontakt.telefon,
      email: kontakt.email ?? "",
      adresse: kontakt.adresse ?? "",
      ist_hauptkontakt: kontakt.ist_hauptkontakt,
    });
    setShowForm(true);
  }

  function abbrechen() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function speichern() {
    if (!form.name.trim() || !form.telefon.trim()) {
      toast.error("Name und Telefonnummer sind erforderlich.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        beziehung: form.beziehung || null,
        telefon: form.telefon.trim(),
        email: form.email.trim() || null,
        adresse: form.adresse.trim() || null,
        ist_hauptkontakt: form.ist_hauptkontakt,
      };

      if (editId) {
        const res = await fetch("/api/notfallkontakte", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...payload }),
        });
        if (!res.ok) throw new Error();
        toast.success("Kontakt aktualisiert");
      } else {
        const res = await fetch("/api/notfallkontakte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Kontakt hinzugefügt");
      }
      abbrechen();
      await laden();
    } catch {
      toast.error("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Diesen Kontakt wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/notfallkontakte?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Kontakt gelöscht");
      setKontakte((prev) => prev.filter((k) => k.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  async function hauptkontaktSetzen(kontakt: Notfallkontakt) {
    if (kontakt.ist_hauptkontakt) return;
    try {
      const res = await fetch("/api/notfallkontakte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: kontakt.id, ist_hauptkontakt: true }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${kontakt.name} als Hauptkontakt gesetzt`);
      await laden();
    } catch {
      toast.error("Fehler beim Setzen des Hauptkontakts.");
    }
  }

  const hauptkontakt = kontakte.find((k) => k.ist_hauptkontakt);
  const weitereKontakte = kontakte.filter((k) => !k.ist_hauptkontakt);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-[--muted] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[--muted-foreground]">
          {kontakte.length} {kontakte.length === 1 ? "Kontakt" : "Kontakte"}
        </p>
        <Button
          size="sm"
          onClick={() => (showForm && !editId ? abbrechen() : setShowForm(true))}
          variant={showForm && !editId ? "outline" : "default"}
        >
          {showForm && !editId ? (
            <><X className="h-4 w-4 mr-1" /> Abbrechen</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" /> Kontakt hinzufügen</>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="border border-[--border] rounded-xl p-4 space-y-3 bg-[--muted]/30">
          <h3 className="font-medium text-sm">
            {editId ? "Kontakt bearbeiten" : "Neuer Notfallkontakt"}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-[--muted-foreground] mb-1 block">Name *</label>
              <Input
                placeholder="Vollständiger Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-[--muted-foreground] mb-1 block">Beziehung</label>
              <Select
                value={form.beziehung}
                onValueChange={(v) => setForm((f) => ({ ...f, beziehung: v as Beziehung }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BEZIEHUNGEN.map((b) => (
                    <SelectItem key={b} value={b}>{BEZIEHUNG_LABEL[b]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[--muted-foreground] mb-1 block">Telefon *</label>
            <Input
              type="tel"
              placeholder="+49 ..."
              value={form.telefon}
              onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <Input
            type="email"
            placeholder="E-Mail (optional)"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            placeholder="Adresse (optional)"
            value={form.adresse}
            onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[--border]"
              checked={form.ist_hauptkontakt}
              onChange={(e) => setForm((f) => ({ ...f, ist_hauptkontakt: e.target.checked }))}
            />
            <span className="text-sm">Als Hauptkontakt festlegen</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={speichern} disabled={saving} size="sm" className="flex-1">
              {saving ? "Speichern..." : editId ? "Aktualisieren" : "Kontakt speichern"}
            </Button>
            <Button onClick={abbrechen} variant="outline" size="sm">Abbrechen</Button>
          </div>
        </div>
      )}

      {kontakte.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Notfallkontakte angelegt.</p>
        </div>
      )}

      {hauptkontakt && (
        <div className="border-2 border-[--primary]/30 rounded-xl p-4 bg-[--primary]/5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-[--primary] fill-[--primary]" />
            <span className="text-xs font-semibold text-[--primary] uppercase tracking-wider">
              Hauptkontakt
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-lg font-bold text-[--foreground]">{hauptkontakt.name}</p>
              {hauptkontakt.beziehung && (
                <p className="text-sm text-[--muted-foreground]">
                  {BEZIEHUNG_LABEL[hauptkontakt.beziehung as Beziehung] ?? hauptkontakt.beziehung}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => editieren(hauptkontakt)}
                className="text-[--muted-foreground] hover:text-[--foreground] p-1"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => loeschen(hauptkontakt.id)}
                className="text-[--muted-foreground] hover:text-red-600 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <a
            href={`tel:${hauptkontakt.telefon}`}
            className="flex items-center gap-2 text-2xl font-bold text-[--primary] hover:underline"
          >
            <Phone className="h-6 w-6" />
            {hauptkontakt.telefon}
          </a>
          {hauptkontakt.email && (
            <a
              href={`mailto:${hauptkontakt.email}`}
              className="flex items-center gap-1 text-sm text-[--muted-foreground] hover:text-[--foreground]"
            >
              <Mail className="h-4 w-4" />
              {hauptkontakt.email}
            </a>
          )}
          {hauptkontakt.adresse && (
            <p className="flex items-start gap-1 text-sm text-[--muted-foreground]">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              {hauptkontakt.adresse}
            </p>
          )}
        </div>
      )}

      {weitereKontakte.length > 0 && (
        <div className="space-y-2">
          {hauptkontakt && (
            <h3 className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wider">
              Weitere Kontakte
            </h3>
          )}
          {weitereKontakte.map((kontakt) => (
            <div
              key={kontakt.id}
              className="border border-[--border] rounded-xl p-3 flex items-start gap-3 bg-[--background]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-[--foreground]">{kontakt.name}</p>
                  {kontakt.beziehung && (
                    <Badge variant="outline" className="text-xs">
                      {BEZIEHUNG_LABEL[kontakt.beziehung as Beziehung] ?? kontakt.beziehung}
                    </Badge>
                  )}
                </div>
                <a
                  href={`tel:${kontakt.telefon}`}
                  className="flex items-center gap-1 text-base font-semibold text-[--foreground] hover:text-[--primary] mt-0.5"
                >
                  <Phone className="h-4 w-4" />
                  {kontakt.telefon}
                </a>
                {kontakt.email && (
                  <p className="text-xs text-[--muted-foreground] mt-0.5">{kontakt.email}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => hauptkontaktSetzen(kontakt)}
                  className="text-[--muted-foreground] hover:text-[--primary] p-1"
                  title="Als Hauptkontakt setzen"
                >
                  <Star className="h-4 w-4" />
                </button>
                <button
                  onClick={() => editieren(kontakt)}
                  className="text-[--muted-foreground] hover:text-[--foreground] p-1"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => loeschen(kontakt.id)}
                  className="text-[--muted-foreground] hover:text-red-600 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
