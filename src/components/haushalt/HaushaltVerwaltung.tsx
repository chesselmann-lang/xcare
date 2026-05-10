"use client";

import { useState } from "react";
import { Home, Users, Shield, Plus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type {
  Haushalt,
  Haushaltsmitglied,
  Vollmacht,
  HaushaltRolle,
  VollmachtTyp,
} from "@/lib/haushalt/types";
import {
  HAUSHALT_ROLLEN_LABELS,
  VOLLMACHT_TYP_LABELS,
} from "@/lib/haushalt/types";

interface HaushaltVerwaltungProps {
  initialHaushalt: Haushalt | null;
  initialMitglieder: Haushaltsmitglied[];
  initialVollmachten: Vollmacht[];
}

type ActiveTab = "haushalt" | "mitglieder" | "vollmachten";

export function HaushaltVerwaltung({
  initialHaushalt,
  initialMitglieder,
  initialVollmachten,
}: HaushaltVerwaltungProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("haushalt");
  const [haushalt, setHaushalt] = useState<Haushalt | null>(initialHaushalt);
  const [mitglieder, setMitglieder] = useState<Haushaltsmitglied[]>(initialMitglieder);
  const [vollmachten, setVollmachten] = useState<Vollmacht[]>(initialVollmachten);

  // Haushalt erstellen
  const [haushaltName, setHaushaltName] = useState("");
  const [haushaltPlz, setHaushaltPlz] = useState("");
  const [haushaltOrt, setHaushaltOrt] = useState("");
  const [haushaltLaden, setHaushaltLaden] = useState(false);

  // Mitglied hinzufügen
  const [mitgliedVorname, setMitgliedVorname] = useState("");
  const [mitgliedNachname, setMitgliedNachname] = useState("");
  const [mitgliedRolle, setMitgliedRolle] = useState<HaushaltRolle>("angehoeriger");
  const [mitgliedPflegegrad, setMitgliedPflegegrad] = useState<string>("");
  const [mitgliedGeburtsdatum, setMitgliedGeburtsdatum] = useState("");
  const [mitgliedLaden, setMitgliedLaden] = useState(false);
  const [mitgliedFormZeigen, setMitgliedFormZeigen] = useState(false);

  // Vollmacht erstellen
  const [vollmachtTyp, setVollmachtTyp] = useState<VollmachtTyp>("vorsorgevollmacht");
  const [vollmachtTitel, setVollmachtTitel] = useState("");
  const [vollmachtBeschreibung, setVollmachtBeschreibung] = useState("");
  const [vollmachtGueltigAb, setVollmachtGueltigAb] = useState("");
  const [vollmachtGueltigBis, setVollmachtGueltigBis] = useState("");
  const [vollmachtNotariell, setVollmachtNotariell] = useState(false);
  const [vollmachtRegistriertBei, setVollmachtRegistriertBei] = useState("");
  const [vollmachtLaden, setVollmachtLaden] = useState(false);
  const [vollmachtFormZeigen, setVollmachtFormZeigen] = useState(false);

  const haushaltErstellen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!haushaltName.trim()) {
      toast.error("Bitte geben Sie einen Namen für den Haushalt ein.");
      return;
    }
    setHaushaltLaden(true);
    try {
      const res = await fetch("/api/haushalt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: haushaltName, plz: haushaltPlz, ort: haushaltOrt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Erstellen des Haushalts");
      setHaushalt(data.haushalt);
      toast.success("Haushalt erfolgreich erstellt!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setHaushaltLaden(false);
    }
  };

  const mitgliedHinzufuegen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitgliedVorname.trim() || !mitgliedNachname.trim()) {
      toast.error("Bitte Vor- und Nachname eingeben.");
      return;
    }
    setMitgliedLaden(true);
    try {
      const res = await fetch("/api/haushalt/mitglieder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vorname: mitgliedVorname,
          nachname: mitgliedNachname,
          rolle: mitgliedRolle,
          pflegegrad: mitgliedPflegegrad ? parseInt(mitgliedPflegegrad) : null,
          geburtsdatum: mitgliedGeburtsdatum || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Hinzufügen des Mitglieds");
      setMitglieder((prev) => [...prev, data.mitglied]);
      setMitgliedVorname("");
      setMitgliedNachname("");
      setMitgliedRolle("angehoeriger");
      setMitgliedPflegegrad("");
      setMitgliedGeburtsdatum("");
      setMitgliedFormZeigen(false);
      toast.success(`${data.mitglied.vorname} ${data.mitglied.nachname} wurde hinzugefügt.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setMitgliedLaden(false);
    }
  };

  const vollmachtErstellen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vollmachtTitel.trim()) {
      toast.error("Bitte einen Titel für die Vollmacht eingeben.");
      return;
    }
    setVollmachtLaden(true);
    try {
      const res = await fetch("/api/haushalt/vollmachten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typ: vollmachtTyp,
          titel: vollmachtTitel,
          beschreibung: vollmachtBeschreibung,
          gueltig_ab: vollmachtGueltigAb,
          gueltig_bis: vollmachtGueltigBis,
          notariell: vollmachtNotariell,
          registriert_beim: vollmachtRegistriertBei,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Erstellen der Vollmacht");
      setVollmachten((prev) => [data.vollmacht, ...prev]);
      setVollmachtTitel("");
      setVollmachtBeschreibung("");
      setVollmachtGueltigAb("");
      setVollmachtGueltigBis("");
      setVollmachtNotariell(false);
      setVollmachtRegistriertBei("");
      setVollmachtFormZeigen(false);
      toast.success("Vollmacht erfolgreich angelegt.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setVollmachtLaden(false);
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "haushalt", label: "Haushalt", icon: Home },
    { id: "mitglieder", label: "Mitglieder", icon: Users },
    { id: "vollmachten", label: "Vollmachten", icon: Shield },
  ];

  return (
    <div>
      {/* Tab-Leiste */}
      <div className="flex gap-1 p-1 rounded-xl bg-[--muted] mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-[--card] text-[--foreground] shadow-sm"
                : "text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "mitglieder" && mitglieder.length > 0 && (
              <span className="ml-1 text-xs bg-[--primary] text-white rounded-full px-1.5 py-0.5 leading-none">
                {mitglieder.length}
              </span>
            )}
            {id === "vollmachten" && vollmachten.length > 0 && (
              <span className="ml-1 text-xs bg-[--primary] text-white rounded-full px-1.5 py-0.5 leading-none">
                {vollmachten.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Haushalt */}
      {activeTab === "haushalt" && (
        <div className="space-y-4">
          {haushalt ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-4 w-4 text-[--primary]" />
                  Ihr Haushalt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-[--foreground]">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="font-medium">{haushalt.name}</span>
                </div>
                {(haushalt.plz || haushalt.ort) && (
                  <p className="text-sm text-[--muted-foreground] pl-6">
                    {[haushalt.plz, haushalt.ort].filter(Boolean).join(" ")}
                  </p>
                )}
                <div className="pt-2 border-t border-[--border]">
                  <p className="text-xs text-[--muted-foreground]">
                    Haushalt erstellt am{" "}
                    {new Date(haushalt.created_at).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-4 w-4 text-[--primary]" />
                  Haushalt erstellen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-700">
                    Sie haben noch keinen Haushalt. Erstellen Sie einen, um Mitglieder
                    und Vollmachten zu verwalten.
                  </p>
                </div>
                <form onSubmit={haushaltErstellen} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[--foreground] mb-1">
                      Name des Haushalts <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={haushaltName}
                      onChange={(e) => setHaushaltName(e.target.value)}
                      placeholder="z.B. Familie Müller"
                      className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[--foreground] mb-1">PLZ</label>
                      <input
                        type="text"
                        value={haushaltPlz}
                        onChange={(e) => setHaushaltPlz(e.target.value)}
                        placeholder="z.B. 80331"
                        maxLength={5}
                        className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[--foreground] mb-1">Ort</label>
                      <input
                        type="text"
                        value={haushaltOrt}
                        onChange={(e) => setHaushaltOrt(e.target.value)}
                        placeholder="z.B. München"
                        className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={haushaltLaden} className="w-full">
                    {haushaltLaden ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Wird erstellt…</>
                    ) : (
                      <><Home className="h-4 w-4" /> Haushalt erstellen</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Mitglieder */}
      {activeTab === "mitglieder" && (
        <div className="space-y-4">
          {!haushalt && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">
                Bitte erstellen Sie zuerst einen Haushalt, bevor Sie Mitglieder hinzufügen.
              </p>
            </div>
          )}

          {mitglieder.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-[--primary]" />
                  Haushaltsmitglieder ({mitglieder.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mitglieder.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-[--border] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-[--foreground]">
                        {m.vorname} {m.nachname}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[--muted-foreground]">
                          {HAUSHALT_ROLLEN_LABELS[m.rolle]}
                        </span>
                        {m.pflegegrad && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            Pflegegrad {m.pflegegrad}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {mitglieder.length === 0 && haushalt && (
            <p className="text-sm text-[--muted-foreground] text-center py-4">
              Noch keine Mitglieder hinzugefügt.
            </p>
          )}

          {haushalt && (
            <>
              {!mitgliedFormZeigen ? (
                <Button variant="outline" onClick={() => setMitgliedFormZeigen(true)} className="w-full">
                  <Plus className="h-4 w-4" /> Mitglied hinzufügen
                </Button>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[--primary]" />
                      Neues Mitglied
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={mitgliedHinzufuegen} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-[--foreground] mb-1">
                            Vorname <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={mitgliedVorname}
                            onChange={(e) => setMitgliedVorname(e.target.value)}
                            placeholder="Vorname"
                            className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[--foreground] mb-1">
                            Nachname <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={mitgliedNachname}
                            onChange={(e) => setMitgliedNachname(e.target.value)}
                            placeholder="Nachname"
                            className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[--foreground] mb-1">
                          Rolle im Haushalt <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={mitgliedRolle}
                          onChange={(e) => setMitgliedRolle(e.target.value as HaushaltRolle)}
                          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                        >
                          {(Object.entries(HAUSHALT_ROLLEN_LABELS) as [HaushaltRolle, string][]).map(
                            ([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            )
                          )}
                        </select>
                      </div>

                      {mitgliedRolle === "pflegebeduerftig" && (
                        <div>
                          <label className="block text-sm font-medium text-[--foreground] mb-1">
                            Pflegegrad (optional)
                          </label>
                          <select
                            value={mitgliedPflegegrad}
                            onChange={(e) => setMitgliedPflegegrad(e.target.value)}
                            className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                          >
                            <option value="">Keiner / Unbekannt</option>
                            {[1, 2, 3, 4, 5].map((g) => (
                              <option key={g} value={g}>Pflegegrad {g}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-[--foreground] mb-1">
                          Geburtsdatum (optional)
                        </label>
                        <input
                          type="date"
                          value={mitgliedGeburtsdatum}
                          onChange={(e) => setMitgliedGeburtsdatum(e.target.value)}
                          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setMitgliedFormZeigen(false)} className="flex-1">
                          Abbrechen
                        </Button>
                        <Button type="submit" disabled={mitgliedLaden} className="flex-1">
                          {mitgliedLaden ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</>
                          ) : (
                            <><Plus className="h-4 w-4" /> Hinzufügen</>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Vollmachten */}
      {activeTab === "vollmachten" && (
        <div className="space-y-4">
          {!haushalt && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">
                Bitte erstellen Sie zuerst einen Haushalt, bevor Sie Vollmachten anlegen.
              </p>
            </div>
          )}

          {vollmachten.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[--primary]" />
                  Vollmachten & Verfügungen ({vollmachten.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {vollmachten.map((v) => (
                  <div key={v.id} className="rounded-lg border border-[--border] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[--foreground] truncate">{v.titel}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs bg-[--muted] text-[--muted-foreground] px-2 py-0.5 rounded-full">
                            {VOLLMACHT_TYP_LABELS[v.typ]}
                          </span>
                          {v.notariell && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Notariell beglaubigt
                            </span>
                          )}
                          {v.aktiv ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Aktiv</span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inaktiv</span>
                          )}
                        </div>
                        {(v.gueltig_ab || v.gueltig_bis) && (
                          <p className="text-xs text-[--muted-foreground] mt-1">
                            Gültig:{" "}
                            {v.gueltig_ab ? new Date(v.gueltig_ab).toLocaleDateString("de-DE") : "–"}{" "}
                            bis{" "}
                            {v.gueltig_bis ? new Date(v.gueltig_bis).toLocaleDateString("de-DE") : "unbefristet"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {vollmachten.length === 0 && haushalt && (
            <p className="text-sm text-[--muted-foreground] text-center py-4">
              Noch keine Vollmachten oder Verfügungen angelegt.
            </p>
          )}

          {haushalt && (
            <>
              {!vollmachtFormZeigen ? (
                <Button variant="outline" onClick={() => setVollmachtFormZeigen(true)} className="w-full">
                  <Plus className="h-4 w-4" /> Vollmacht anlegen
                </Button>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[--primary]" />
                      Neue Vollmacht / Verfügung
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={vollmachtErstellen} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[--foreground] mb-1">
                          Typ <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={vollmachtTyp}
                          onChange={(e) => setVollmachtTyp(e.target.value as VollmachtTyp)}
                          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                        >
                          {(Object.entries(VOLLMACHT_TYP_LABELS) as [VollmachtTyp, string][]).map(
                            ([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[--foreground] mb-1">
                          Titel <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={vollmachtTitel}
                          onChange={(e) => setVollmachtTitel(e.target.value)}
                          placeholder="z.B. Vorsorgevollmacht von Max Mustermann"
                          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[--foreground] mb-1">
                          Beschreibung (optional)
                        </label>
                        <textarea
                          value={vollmachtBeschreibung}
                          onChange={(e) => setVollmachtBeschreibung(e.target.value)}
                          placeholder="Kurze Beschreibung des Inhalts…"
                          rows={3}
                          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-[--foreground] mb-1">Gültig ab</label>
                          <input
                            type="date"
                            value={vollmachtGueltigAb}
                            onChange={(e) => setVollmachtGueltigAb(e.target.value)}
                            className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[--foreground] mb-1">Gültig bis</label>
                          <input
                            type="date"
                            value={vollmachtGueltigBis}
                            onChange={(e) => setVollmachtGueltigBis(e.target.value)}
                            className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[--foreground] mb-1">
                          Registriert beim Gericht / Notar (optional)
                        </label>
                        <input
                          type="text"
                          value={vollmachtRegistriertBei}
                          onChange={(e) => setVollmachtRegistriertBei(e.target.value)}
                          placeholder="z.B. Amtsgericht München"
                          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                        />
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vollmachtNotariell}
                          onChange={(e) => setVollmachtNotariell(e.target.checked)}
                          className="h-4 w-4 rounded border-[--border] text-[--primary] focus:ring-[--primary]"
                        />
                        <span className="text-sm text-[--foreground]">Notariell beglaubigt</span>
                      </label>

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setVollmachtFormZeigen(false)} className="flex-1">
                          Abbrechen
                        </Button>
                        <Button type="submit" disabled={vollmachtLaden} className="flex-1">
                          {vollmachtLaden ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</>
                          ) : (
                            <><Shield className="h-4 w-4" /> Anlegen</>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
