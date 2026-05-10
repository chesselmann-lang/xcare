"use client";

import { useState, useRef } from "react";
import {
  Lock,
  Upload,
  Trash2,
  Download,
  AlertTriangle,
  FileText,
  X,
  Loader2,
  Plus,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Dokument, DokumentKategorie } from "@/lib/dokumente/types";
import {
  DOKUMENT_KATEGORIE_LABELS,
  DOKUMENT_KATEGORIE_EMOJI,
  DOKUMENT_KATEGORIEN,
} from "@/lib/dokumente/types";

interface DokumentenTresorProps {
  initialDokumente: Dokument[];
}

const TAGE_BIS_ABLAUF_WARNUNG = 60;

function tageBleibt(ablaufdatum: string): number {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const ablauf = new Date(ablaufdatum);
  return Math.ceil((ablauf.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateDE(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DokumentenTresor({ initialDokumente }: DokumentenTresorProps) {
  const [dokumente, setDokumente] = useState<Dokument[]>(initialDokumente);
  const [aktiverFilter, setAktiverFilter] = useState<DokumentKategorie | "alle">("alle");
  const [modalOffen, setModalOffen] = useState(false);
  const [hochladen, setHochladen] = useState(false);
  const [loeschenId, setLoeschenId] = useState<string | null>(null);

  // Upload-Formular
  const [uploadName, setUploadName] = useState("");
  const [uploadKategorie, setUploadKategorie] = useState<DokumentKategorie>("sonstiges");
  const [uploadAblaufdatum, setUploadAblaufdatum] = useState("");
  const [uploadNotizen, setUploadNotizen] = useState("");
  const [uploadDatei, setUploadDatei] = useState<File | null>(null);
  const dateiInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const gefilterteDokumente =
    aktiverFilter === "alle"
      ? dokumente
      : dokumente.filter((d) => d.kategorie === aktiverFilter);

  const ablaufendeDokumente = dokumente.filter(
    (d) => d.ablaufdatum && tageBleibt(d.ablaufdatum) <= TAGE_BIS_ABLAUF_WARNUNG
  );

  const dateiAuswaehlen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const datei = e.target.files?.[0];
    if (!datei) return;
    setUploadDatei(datei);
    if (!uploadName) setUploadName(datei.name.replace(/\.[^/.]+$/, ""));
  };

  const modalReset = () => {
    setUploadName("");
    setUploadKategorie("sonstiges");
    setUploadAblaufdatum("");
    setUploadNotizen("");
    setUploadDatei(null);
    if (dateiInputRef.current) dateiInputRef.current.value = "";
  };

  const dokumentHochladen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDatei) {
      toast.error("Bitte wählen Sie eine Datei aus.");
      return;
    }
    if (!uploadName.trim()) {
      toast.error("Bitte vergeben Sie einen Namen für das Dokument.");
      return;
    }

    setHochladen(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Nicht eingeloggt");

      // TODO: Implement client-side AES-256 encryption before upload
      // Aktuell: Upload ohne Verschlüsselung (Phase 2C MVP)
      const dateiPfad = `${user.id}/${Date.now()}_${uploadDatei.name}`;

      const { error: storageError } = await supabase.storage
        .from("dokumente")
        .upload(dateiPfad, uploadDatei, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) throw new Error(`Upload-Fehler: ${storageError.message}`);

      const res = await fetch("/api/dokumente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName.trim(),
          kategorie: uploadKategorie,
          storage_path: dateiPfad,
          mime_type: uploadDatei.type || null,
          groesse_bytes: uploadDatei.size,
          ablaufdatum: uploadAblaufdatum || null,
          notizen: uploadNotizen || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Speichern");

      setDokumente((prev) => [data.dokument, ...prev]);
      setModalOffen(false);
      modalReset();
      toast.success("Dokument erfolgreich hochgeladen.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setHochladen(false);
    }
  };

  const dokumentHerunterladen = async (dok: Dokument) => {
    try {
      const { data, error } = await supabase.storage
        .from("dokumente")
        .createSignedUrl(dok.storage_path, 60);

      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = dok.name;
      link.click();
    } catch {
      toast.error("Download fehlgeschlagen.");
    }
  };

  const dokumentLoeschen = async (id: string) => {
    setLoeschenId(id);
    try {
      const res = await fetch(`/api/dokumente/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Fehler beim Löschen");
      }
      setDokumente((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dokument wurde gelöscht.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoeschenId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Ablauf-Banner */}
      {ablaufendeDokumente.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {ablaufendeDokumente.length}{" "}
              {ablaufendeDokumente.length === 1 ? "Dokument läuft" : "Dokumente laufen"} demnächst ab
            </p>
            <ul className="mt-1 space-y-0.5">
              {ablaufendeDokumente.map((d) => {
                const tage = tageBleibt(d.ablaufdatum!);
                return (
                  <li key={d.id} className="text-xs text-amber-700">
                    {d.name} —{" "}
                    {tage <= 0 ? "bereits abgelaufen" : `noch ${tage} ${tage === 1 ? "Tag" : "Tage"}`}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Aktionsleiste */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-[--primary]" />
          <span className="text-sm font-medium text-[--muted-foreground]">
            {dokumente.length} {dokumente.length === 1 ? "Dokument" : "Dokumente"} gespeichert
          </span>
        </div>
        <Button onClick={() => setModalOffen(true)}>
          <Upload className="h-4 w-4" /> Dokument hochladen
        </Button>
      </div>

      {/* Kategorien-Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setAktiverFilter("alle")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            aktiverFilter === "alle"
              ? "bg-[--primary] text-white"
              : "bg-[--muted] text-[--muted-foreground] hover:text-[--foreground]"
          }`}
        >
          Alle
        </button>
        {DOKUMENT_KATEGORIEN.map((kat) => (
          <button
            key={kat}
            onClick={() => setAktiverFilter(kat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              aktiverFilter === kat
                ? "bg-[--primary] text-white"
                : "bg-[--muted] text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            <span>{DOKUMENT_KATEGORIE_EMOJI[kat]}</span>
            {DOKUMENT_KATEGORIE_LABELS[kat]}
          </button>
        ))}
      </div>

      {/* Dokumenten-Grid */}
      {gefilterteDokumente.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Lock className="h-10 w-10 text-[--muted-foreground] mx-auto opacity-40" />
          <p className="text-sm text-[--muted-foreground]">
            {aktiverFilter === "alle"
              ? "Noch keine Dokumente hochgeladen."
              : `Keine Dokumente in der Kategorie "${DOKUMENT_KATEGORIE_LABELS[aktiverFilter]}" gefunden.`}
          </p>
          <Button variant="outline" size="sm" onClick={() => setModalOffen(true)}>
            <Plus className="h-3.5 w-3.5" /> Erstes Dokument hochladen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gefilterteDokumente.map((dok) => {
            const tageRestlich = dok.ablaufdatum ? tageBleibt(dok.ablaufdatum) : null;
            const laeuftBaldAb = tageRestlich !== null && tageRestlich <= TAGE_BIS_ABLAUF_WARNUNG;
            const abgelaufen = tageRestlich !== null && tageRestlich <= 0;

            return (
              <Card
                key={dok.id}
                className={`hover:shadow-md transition-shadow ${
                  abgelaufen ? "border-red-200" : laeuftBaldAb ? "border-amber-200" : ""
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl leading-none shrink-0">
                      {DOKUMENT_KATEGORIE_EMOJI[dok.kategorie]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--foreground] truncate">{dok.name}</p>
                      <span className="inline-flex items-center text-xs bg-[--muted] text-[--muted-foreground] px-2 py-0.5 rounded-full mt-0.5">
                        {DOKUMENT_KATEGORIE_LABELS[dok.kategorie]}
                      </span>
                    </div>
                  </div>

                  {dok.ablaufdatum && (
                    <div
                      className={`flex items-center gap-1.5 text-xs ${
                        abgelaufen ? "text-red-600" : laeuftBaldAb ? "text-amber-600" : "text-[--muted-foreground]"
                      }`}
                    >
                      <Calendar className="h-3 w-3 shrink-0" />
                      {abgelaufen
                        ? `Abgelaufen am ${formatDateDE(dok.ablaufdatum)}`
                        : laeuftBaldAb
                        ? `Läuft ab in ${tageRestlich} Tagen`
                        : `Gültig bis ${formatDateDE(dok.ablaufdatum)}`}
                    </div>
                  )}

                  {dok.groesse_bytes && (
                    <p className="text-xs text-[--muted-foreground]">{formatBytes(dok.groesse_bytes)}</p>
                  )}

                  {dok.notizen && (
                    <p className="text-xs text-[--muted-foreground] line-clamp-2 border-t border-[--border] pt-2">
                      {dok.notizen}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => dokumentHerunterladen(dok)}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-red-500 hover:bg-red-50 hover:border-red-200"
                      onClick={() => dokumentLoeschen(dok.id)}
                      disabled={loeschenId === dok.id}
                    >
                      {loeschenId === dok.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload-Modal */}
      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setModalOffen(false); modalReset(); }}
          />
          <div className="relative w-full max-w-md bg-[--card] rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[--foreground] flex items-center gap-2">
                <Upload className="h-5 w-5 text-[--primary]" />
                Dokument hochladen
              </h2>
              <button
                onClick={() => { setModalOffen(false); modalReset(); }}
                className="p-1.5 rounded-lg hover:bg-[--muted] text-[--muted-foreground]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={dokumentHochladen} className="space-y-4">
              {/* Datei-Auswahl */}
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-1">
                  Datei <span className="text-red-500">*</span>
                </label>
                <div
                  className="border-2 border-dashed border-[--border] rounded-xl p-6 text-center cursor-pointer hover:border-[--primary] hover:bg-[--muted]/30 transition-colors"
                  onClick={() => dateiInputRef.current?.click()}
                >
                  {uploadDatei ? (
                    <div className="space-y-1">
                      <FileText className="h-6 w-6 text-[--primary] mx-auto" />
                      <p className="text-sm font-medium text-[--foreground]">{uploadDatei.name}</p>
                      <p className="text-xs text-[--muted-foreground]">{formatBytes(uploadDatei.size)}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-6 w-6 text-[--muted-foreground] mx-auto" />
                      <p className="text-sm text-[--muted-foreground]">
                        Klicken zum Auswählen oder per Drag & Drop
                      </p>
                      <p className="text-xs text-[--muted-foreground]">PDF, JPG, PNG, DOCX…</p>
                    </div>
                  )}
                </div>
                <input
                  ref={dateiInputRef}
                  type="file"
                  onChange={dateiAuswaehlen}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx,.xls"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-1">
                  Bezeichnung <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="z.B. Reisepass Max Mustermann"
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                  required
                />
              </div>

              {/* Kategorie */}
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-1">
                  Kategorie <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadKategorie}
                  onChange={(e) => setUploadKategorie(e.target.value as DokumentKategorie)}
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                >
                  {DOKUMENT_KATEGORIEN.map((kat) => (
                    <option key={kat} value={kat}>
                      {DOKUMENT_KATEGORIE_EMOJI[kat]} {DOKUMENT_KATEGORIE_LABELS[kat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ablaufdatum */}
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-1">
                  Ablaufdatum (optional)
                </label>
                <input
                  type="date"
                  value={uploadAblaufdatum}
                  onChange={(e) => setUploadAblaufdatum(e.target.value)}
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                />
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-[--foreground] mb-1">
                  Notizen (optional)
                </label>
                <textarea
                  value={uploadNotizen}
                  onChange={(e) => setUploadNotizen(e.target.value)}
                  placeholder="Interne Notizen zum Dokument…"
                  rows={2}
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setModalOffen(false); modalReset(); }}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={hochladen} className="flex-1">
                  {hochladen ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Wird hochgeladen…</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Hochladen</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
