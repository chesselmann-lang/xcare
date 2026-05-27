"use client";

import { useState, useRef } from "react";

interface NotarisierungsEintrag {
  id: string;
  datei_name: string;
  hash: string;
  blockchain: string;
  notarisiert_am: string;
  proof?: string;
  verificationUrl?: string;
}

const DOKUMENT_TYPEN = [
  "Pflegegrad-Bescheid",
  "Widerspruchsbescheid",
  "Pflegevertrag",
  "Vollmacht",
  "Arztbrief",
  "Krankenhausbericht",
  "Kostenaufstellung",
  "Sonstiges",
];

export default function NotarisierungPage() {
  const [aktiveTab, setAktiveTab] = useState<"notarisieren" | "pruefen">("notarisieren");
  const [file, setFile] = useState<File | null>(null);
  const [dokumentTyp, setDokumentTyp] = useState("Sonstiges");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NotarisierungsEintrag | null>(null);
  const [error, setError] = useState("");

  // Verify tab
  const [pruefFile, setPruefFile] = useState<File | null>(null);
  const [pruefHash, setPruefHash] = useState("");
  const [pruefResult, setPruefResult] = useState<{
    valid: boolean;
    message: string;
    datei_name?: string;
    notarisiert_am?: string;
  } | null>(null);
  const [pruefLoading, setPruefLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const pruefFileRef = useRef<HTMLInputElement>(null);

  async function handleNotarisieren(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dokumentTyp", dokumentTyp);

      const res = await fetch("/api/notarisierung", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Fehler beim Notarisieren");

      setResult({
        id: crypto.randomUUID(),
        datei_name: data.fileName,
        hash: data.hash,
        blockchain: data.blockchain,
        notarisiert_am: data.timestamp,
        proof: data.proof,
        verificationUrl: data.verificationUrl,
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function handlePruefen(e: React.FormEvent) {
    e.preventDefault();
    if (!pruefHash) return;
    setPruefLoading(true);
    setPruefResult(null);

    try {
      const params = new URLSearchParams({ hash: pruefHash });
      const res = await fetch(`/api/notarisierung?${params}`);
      const data = await res.json();
      setPruefResult(data);
    } catch {
      setPruefResult({ valid: false, message: "Fehler bei der Verifikation." });
    } finally {
      setPruefLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dokument-Notarisierung</h1>
        <p className="text-gray-500 mt-1">
          Wichtige Dokumente kryptographisch sichern und Echtheit nachweisen.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        🔐 Ihre Dokumente werden mit einem SHA-256 Hash gesichert. Der Hash kann nicht
        rückgängig gemacht werden. Das Dokument selbst wird nicht gespeichert — nur der
        unveränderliche Hash-Fingerabdruck.
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {(["notarisieren", "pruefen"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAktiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              aktiveTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "notarisieren" ? "🔏 Notarisieren" : "🔍 Echtheit prüfen"}
          </button>
        ))}
      </div>

      {/* Notarisieren Tab */}
      {aktiveTab === "notarisieren" && (
        <div>
          <form onSubmit={handleNotarisieren} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Dokument notarisieren</h2>

            {/* Upload area */}
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-4 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-2">📎</div>
              {file ? (
                <div>
                  <div className="font-medium text-gray-800">{file.name}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-gray-700">Datei hier ablegen</div>
                  <div className="text-sm text-gray-400 mt-1">
                    PDF, JPG, PNG, DOCX oder andere Formate
                  </div>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Dokument-Typ */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumententyp
              </label>
              <select
                value={dokumentTyp}
                onChange={(e) => setDokumentTyp(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOKUMENT_TYPEN.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Wird notarisiert …" : "🔏 Jetzt notarisieren"}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✅</span>
                <h3 className="font-semibold text-green-800">Erfolgreich notarisiert!</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-32 shrink-0">Datei:</span>
                  <span className="font-medium text-gray-800">{result.datei_name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-32 shrink-0">Zeitstempel:</span>
                  <span className="text-gray-800">
                    {new Date(result.notarisiert_am).toLocaleString("de-DE")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-32 shrink-0">Blockchain:</span>
                  <span className="text-gray-800">{result.blockchain}</span>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Kryptographischer Hash (SHA-256):</div>
                  <code className="block bg-white border border-green-200 rounded-lg px-3 py-2 text-xs break-all font-mono text-green-800">
                    {result.hash}
                  </code>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.hash);
                    }}
                    className="bg-white border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition-colors"
                  >
                    Hash kopieren
                  </button>
                  {result.verificationUrl && (
                    <a
                      href={result.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      Zertifikat aufrufen ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prüfen Tab */}
      {aktiveTab === "pruefen" && (
        <form onSubmit={handlePruefen} className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Echtheit eines Dokuments prüfen</h2>
          <p className="text-sm text-gray-500 mb-4">
            Geben Sie den gespeicherten Hash ein, um zu prüfen, ob ein Dokument unverändert ist.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SHA-256 Hash des Dokuments
            </label>
            <input
              type="text"
              value={pruefHash}
              onChange={(e) => setPruefHash(e.target.value)}
              placeholder="64-stelliger Hex-Hash …"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!pruefHash || pruefLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {pruefLoading ? "Wird geprüft …" : "🔍 Hash verifizieren"}
          </button>

          {pruefResult && (
            <div
              className={`mt-4 rounded-xl p-4 border ${
                pruefResult.valid
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="font-medium mb-2">
                {pruefResult.valid ? "✅" : "❌"} {pruefResult.message}
              </div>
              {pruefResult.datei_name && (
                <div className="text-sm space-y-1">
                  <div>Datei: {pruefResult.datei_name}</div>
                  {pruefResult.notarisiert_am && (
                    <div>
                      Notarisiert am:{" "}
                      {new Date(pruefResult.notarisiert_am).toLocaleString("de-DE")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
