"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Upload, FileText, CheckCircle, XCircle, Loader2,
  Download, ArrowLeft, Info, Table
} from "lucide-react";
import Link from "next/link";

interface PruefungsZeile {
  zeile: number;
  klienten_nr: string;
  lebenslage: string;
  alter?: number;
  pflegegrad?: number;
  gesamt_monatlich_eur: number;
  ansprueche_count: number;
  fehler?: string;
}

const BEISPIEL_CSV = `klienten_nr,lebenslage,geburtsjahr,pflegegrad
F-001,alter_pflege,1945,3
F-002,geburt_fruehe_kindheit,2023,
F-003,eingliederung_behinderung,1975,2
F-004,erwerbsleben_vereinbarkeit,1980,`;

export default function MassenpruefungPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [verarbeitung, setVerarbeitung] = useState<"idle" | "parsing" | "pruefend" | "fertig" | "fehler">("idle");
  const [ergebnisse, setErgebnisse] = useState<PruefungsZeile[]>([]);
  const [gesamtBetrag, setGesamtBetrag] = useState(0);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast.error("Nur CSV-Dateien erlaubt");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 5 MB)");
      return;
    }
    setFile(f);
    setVerarbeitung("idle");
    setErgebnisse([]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
      return row;
    });
  };

  const starten = async () => {
    if (!file) return;
    setVerarbeitung("parsing");

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("CSV-Datei ist leer oder ungültig");
        setVerarbeitung("fehler");
        return;
      }

      if (rows.length > 1000) {
        toast.error("Maximal 1000 Zeilen pro Upload");
        setVerarbeitung("fehler");
        return;
      }

      setVerarbeitung("pruefend");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();
      const { data: traeger } = await supabase
        .from("traeger_profiles").select("id").eq("profile_id", profile?.id).single();

      if (!traeger) throw new Error("Kein Träger-Profil");

      // Insert massenpruefung record
      const { data: pruefung } = await supabase
        .from("traeger_massenpruefungen")
        .insert({
          traeger_id: traeger.id,
          dateiname: file.name,
          status: "processing",
          zeilen_gesamt: rows.length,
          zeilen_verarbeitet: 0,
        })
        .select("id")
        .single();

      // Call API for each row (batched)
      const ergebnisseList: PruefungsZeile[] = [];
      let gesamt = 0;
      const aktuellesJahr = new Date().getFullYear();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lebenslage = row.lebenslage || row.lebens_lage || "";
        const klientenNr = row.klienten_nr || row.fallnummer || row.fall_nr || `Z-${i + 1}`;
        const geburtsjahr = row.geburtsjahr ? parseInt(row.geburtsjahr) : null;
        const pflegegrad = row.pflegegrad ? parseInt(row.pflegegrad) : null;
        const alter = geburtsjahr ? aktuellesJahr - geburtsjahr : 65;

        try {
          const res = await fetch("/api/traeger/anspruch-pruefen-anonym", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lebenslage, alter, pflegegrad }),
          });

          if (!res.ok) throw new Error(await res.text());
          const { ergebnis } = await res.json();

          const zeile: PruefungsZeile = {
            zeile: i + 1,
            klienten_nr: klientenNr,
            lebenslage,
            alter,
            pflegegrad: pflegegrad ?? undefined,
            gesamt_monatlich_eur: ergebnis?.gesamt_monatlich_eur ?? 0,
            ansprueche_count: (ergebnis?.ansprueche ?? []).filter((a: { voraussetzungen_erfuellt: boolean }) => a.voraussetzungen_erfuellt).length,
          };
          ergebnisseList.push(zeile);
          gesamt += zeile.gesamt_monatlich_eur;
        } catch (err) {
          ergebnisseList.push({
            zeile: i + 1,
            klienten_nr: klientenNr,
            lebenslage,
            alter,
            gesamt_monatlich_eur: 0,
            ansprueche_count: 0,
            fehler: String(err),
          });
        }
      }

      // Update massenpruefung record
      if (pruefung?.id) {
        await supabase.from("traeger_massenpruefungen").update({
          status: "completed",
          zeilen_verarbeitet: rows.length,
        }).eq("id", pruefung.id);
      }

      setErgebnisse(ergebnisseList);
      setGesamtBetrag(gesamt);
      setVerarbeitung("fertig");
      toast.success(`${rows.length} Klienten geprüft`);

    } catch (err) {
      toast.error("Fehler: " + String(err));
      setVerarbeitung("fehler");
    }
  };

  const exportCSV = () => {
    const header = "Zeile,Klienten-Nr,Lebenslage,Alter,Pflegegrad,Gesamt €/Mon,Ansprüche,Fehler";
    const rows = ergebnisse.map(r =>
      `${r.zeile},"${r.klienten_nr}","${r.lebenslage}",${r.alter ?? ""},${r.pflegegrad ?? ""},${r.gesamt_monatlich_eur},${r.ansprueche_count},"${r.fehler ?? ""}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `massenpruefung-ergebnisse-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBeispiel = () => {
    const blob = new Blob([BEISPIEL_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "beispiel-import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/traeger/dashboard" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Massenprüfung (CSV-Upload)</h1>
          <p className="text-sm text-gray-500">Anspruchsprüfung für mehrere Klienten auf einmal</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">CSV-Format</p>
          <p>Erforderliche Spalten: <code className="bg-blue-100 px-1 rounded">klienten_nr</code>, <code className="bg-blue-100 px-1 rounded">lebenslage</code></p>
          <p>Optionale Spalten: <code className="bg-blue-100 px-1 rounded">geburtsjahr</code>, <code className="bg-blue-100 px-1 rounded">pflegegrad</code></p>
          <button onClick={downloadBeispiel} className="mt-2 text-blue-600 hover:underline flex items-center gap-1 font-medium">
            <Download className="h-3.5 w-3.5" /> Beispiel-CSV herunterladen
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      {verarbeitung === "idle" || verarbeitung === "fehler" ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          {file ? (
            <div>
              <p className="font-medium text-gray-800">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-700">CSV-Datei hierher ziehen</p>
              <p className="text-sm text-gray-400 mt-1">oder klicken zum Auswählen · Max. 5 MB, 1.000 Zeilen</p>
            </div>
          )}
        </div>
      ) : null}

      {file && (verarbeitung === "idle" || verarbeitung === "fehler") && (
        <button
          onClick={starten}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Table className="h-4 w-4" /> Prüfung starten
        </button>
      )}

      {/* Verarbeitung */}
      {(verarbeitung === "parsing" || verarbeitung === "pruefend") && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="font-medium text-gray-800">
            {verarbeitung === "parsing" ? "CSV wird gelesen…" : "Ansprüche werden geprüft…"}
          </p>
          <p className="text-sm text-gray-500 mt-1">Bitte warten</p>
        </div>
      )}

      {/* Ergebnisse */}
      {verarbeitung === "fertig" && ergebnisse.length > 0 && (
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{ergebnisse.length}</p>
              <p className="text-xs text-gray-500 mt-1">Klienten geprüft</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{gesamtBetrag.toLocaleString("de-DE")}€</p>
              <p className="text-xs text-green-600 mt-1">Gesamt/Monat</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">{ergebnisse.filter(e => !e.fehler).length}</p>
              <p className="text-xs text-purple-600 mt-1">Erfolgreich</p>
            </div>
          </div>

          {/* Tabelle */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Ergebnisse</h2>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Download className="h-4 w-4" /> CSV exportieren
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Klienten-Nr.</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Lebenslage</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">PG</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">€/Mon</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ergebnisse.map((r) => (
                    <tr key={r.zeile} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{r.zeile}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{r.klienten_nr}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.lebenslage || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{r.pflegegrad ? `PG${r.pflegegrad}` : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-700">
                        {r.fehler ? "—" : `${r.gesamt_monatlich_eur}€`}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.fehler
                          ? <XCircle className="h-4 w-4 text-red-400 mx-auto" title={r.fehler} />
                          : <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={() => { setFile(null); setVerarbeitung("idle"); setErgebnisse([]); }}
            className="w-full py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Neue Prüfung starten
          </button>
        </div>
      )}
    </div>
  );
}
