"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ExtrahierteDaten {
  pflegegrad?: number | null;
  datum?: string | null;
  aktenzeichen?: string | null;
  absender?: string | null;
  begruendung?: string | null;
  widerspruchsmoeglich?: boolean;
  widerspruchsfrist_tage?: number | null;
}

interface DokumentAnalyse {
  id: string;
  dateiname: string;
  dateityp?: string;
  dokument_typ?: string;
  ki_zusammenfassung?: string;
  ki_extrahierte_daten?: ExtrahierteDaten;
  ki_handlungsempfehlung?: string;
  ki_widerspruch_begruendung?: string;
  status: "ausstehend" | "verarbeitung" | "fertig" | "fehler";
  fehler_nachricht?: string;
  created_at: string;
}

interface Props {
  initialAnalysen: DokumentAnalyse[];
}

const DOKUMENT_TYP_LABELS: Record<string, string> = {
  mdk_bescheid: "MDK-Bescheid",
  pflegegutachten: "Pflegegutachten",
  ablehnungsbescheid: "Ablehnungsbescheid",
  widerspruchsbescheid: "Widerspruchsbescheid",
  kassenschreiben: "Kassenschreiben",
  arztbrief: "Arztbrief",
  sonstiges: "Sonstiges",
};

const DOKUMENT_TYP_COLORS: Record<string, string> = {
  mdk_bescheid: "bg-blue-100 text-blue-800",
  pflegegutachten: "bg-purple-100 text-purple-800",
  ablehnungsbescheid: "bg-red-100 text-red-800",
  widerspruchsbescheid: "bg-orange-100 text-orange-800",
  kassenschreiben: "bg-gray-100 text-gray-800",
  arztbrief: "bg-green-100 text-green-800",
  sonstiges: "bg-gray-100 text-gray-600",
};

const FILE_TYPE_ICONS: Record<string, string> = {
  "application/pdf": "📄",
  "image/jpeg": "🖼️",
  "image/png": "🖼️",
  "image/heic": "🖼️",
  "image/webp": "🖼️",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AnalyseKarte({ analyse }: { analyse: DokumentAnalyse }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const extDaten = analyse.ki_extrahierte_daten ?? {};

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{analyse.dateiname}</span>
            {analyse.dokument_typ && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  DOKUMENT_TYP_COLORS[analyse.dokument_typ] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {DOKUMENT_TYP_LABELS[analyse.dokument_typ] ?? analyse.dokument_typ}
              </span>
            )}
            {analyse.status === "verarbeitung" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
                Wird analysiert...
              </span>
            )}
            {analyse.status === "fehler" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                Fehler
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {new Date(analyse.created_at).toLocaleString("de-DE")}
          </p>
        </div>
        <span className="text-gray-400 text-sm ml-4">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded content */}
      {expanded && analyse.status === "fertig" && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Extracted data */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {extDaten.pflegegrad != null && (
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600 font-medium">Pflegegrad</p>
                <p className="text-lg font-bold text-blue-900">{extDaten.pflegegrad}</p>
              </div>
            )}
            {extDaten.datum && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 font-medium">Datum</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(extDaten.datum).toLocaleDateString("de-DE")}
                </p>
              </div>
            )}
            {extDaten.aktenzeichen && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 font-medium">Aktenzeichen</p>
                <p className="text-sm font-mono text-gray-900 break-all">{extDaten.aktenzeichen}</p>
              </div>
            )}
            {extDaten.absender && (
              <div className="rounded-lg bg-gray-50 p-3 col-span-2">
                <p className="text-xs text-gray-500 font-medium">Absender</p>
                <p className="text-sm text-gray-900">{extDaten.absender}</p>
              </div>
            )}
            {extDaten.widerspruchsmoeglich && extDaten.widerspruchsfrist_tage && (
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-xs text-orange-600 font-medium">Widerspruchsfrist</p>
                <p className="text-sm font-bold text-orange-900">{extDaten.widerspruchsfrist_tage} Tage</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {analyse.ki_zusammenfassung && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                KI-Zusammenfassung
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{analyse.ki_zusammenfassung}</p>
            </div>
          )}

          {/* Handlungsempfehlung */}
          {analyse.ki_handlungsempfehlung && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                Handlungsempfehlung
              </p>
              <p className="text-sm text-green-900 leading-relaxed">{analyse.ki_handlungsempfehlung}</p>
            </div>
          )}

          {/* Widerspruch */}
          {analyse.ki_widerspruch_begruendung && (
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                Mögliche Widerspruchsargumente
              </p>
              <p className="text-sm text-orange-900 leading-relaxed">{analyse.ki_widerspruch_begruendung}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {extDaten.widerspruchsmoeglich && (
              <button
                onClick={() => router.push("/familie/widerspruch")}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                Widerspruch starten
              </button>
            )}
            <button
              onClick={() => window.open("https://anwaltsuche.de/suche/Pflegerecht", "_blank")}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Anwalt finden
            </button>
          </div>
        </div>
      )}

      {expanded && analyse.status === "fehler" && (
        <div className="border-t border-gray-100 p-4">
          <p className="text-sm text-red-600">
            Analyse fehlgeschlagen: {analyse.fehler_nachricht ?? "Unbekannter Fehler"}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DokumenteKIClient({ initialAnalysen }: Props) {
  const [analysen, setAnalysen] = useState<DokumentAnalyse[]>(initialAnalysen);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const erlaubt = [".pdf", ".jpg", ".jpeg", ".png", ".heic"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!erlaubt.includes(ext)) {
      setUploadMsg("Nicht unterstütztes Format. Erlaubt: PDF, JPG, PNG, HEIC");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadMsg("Datei zu groß. Maximum: 5 MB");
      return;
    }
    setSelectedFile(file);
    setUploadMsg(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  async function uploadAndAnalyze() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadMsg("Dokument wird hochgeladen und analysiert...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/dokumente/analysieren", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        setUploadMsg(json.error ?? "Upload fehlgeschlagen");
        return;
      }

      const json = await res.json();

      // Optimistically add to list
      setAnalysen(prev => [
        {
          id: json.analyseId,
          dateiname: selectedFile.name,
          dateityp: selectedFile.type,
          status: "fertig",
          created_at: new Date().toISOString(),
          dokument_typ: json.ergebnisse?.dokument_typ,
          ki_zusammenfassung: json.ergebnisse?.zusammenfassung,
          ki_extrahierte_daten: {
            pflegegrad: json.ergebnisse?.pflegegrad,
            datum: json.ergebnisse?.datum,
            aktenzeichen: json.ergebnisse?.aktenzeichen,
            absender: json.ergebnisse?.absender,
            begruendung: json.ergebnisse?.begruendung,
            widerspruchsmoeglich: json.ergebnisse?.widerspruchsmoeglich,
            widerspruchsfrist_tage: json.ergebnisse?.widerspruchsfrist_tage,
          },
          ki_handlungsempfehlung: json.ergebnisse?.handlungsempfehlung,
          ki_widerspruch_begruendung: json.ergebnisse?.widerspruch_begruendung,
        },
        ...prev,
      ]);

      setSelectedFile(null);
      setUploadMsg("Analyse abgeschlossen!");
      setTimeout(() => setUploadMsg(null), 5000);
    } catch {
      setUploadMsg("Verbindungsfehler beim Upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-indigo-500 bg-indigo-50"
            : selectedFile
            ? "border-green-400 bg-green-50"
            : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {selectedFile ? (
          <div className="space-y-2">
            <p className="text-2xl">
              {FILE_TYPE_ICONS[selectedFile.type] ?? "📎"}
            </p>
            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(selectedFile.size)}</p>
            <button
              onClick={e => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="text-xs text-red-500 hover:underline"
            >
              Entfernen
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-3xl">📂</p>
            <p className="text-sm font-medium text-gray-700">
              Dokument hier ablegen oder klicken
            </p>
            <p className="text-xs text-gray-400">PDF, JPG, PNG, HEIC — max. 5 MB</p>
          </div>
        )}
      </div>

      {/* Status message */}
      {uploadMsg && (
        <p
          className={`text-sm px-4 py-2.5 rounded-lg ${
            uploadMsg.includes("fehler") || uploadMsg.includes("groß") || uploadMsg.includes("Nicht")
              ? "bg-red-50 text-red-700"
              : uploadMsg.includes("abgeschlossen")
              ? "bg-green-50 text-green-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {uploadMsg}
        </p>
      )}

      {/* Upload button */}
      {selectedFile && (
        <button
          onClick={uploadAndAnalyze}
          disabled={uploading}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Wird analysiert...
            </>
          ) : (
            "Dokument analysieren"
          )}
        </button>
      )}

      {/* Previous analyses */}
      {analysen.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Frühere Analysen</h3>
          <div className="space-y-3">
            {analysen.map(a => (
              <AnalyseKarte key={a.id} analyse={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
