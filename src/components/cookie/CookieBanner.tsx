"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";

type ConsentState = {
  notwendig: true;       // always true, not toggleable
  analyse: boolean;
  marketing: boolean;
  timestamp: number;
};

const STORAGE_KEY = "xcare_cookie_consent";

function loadConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function saveConsent(consent: ConsentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Storage not available
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyse, setAnalyse] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = loadConsent();
    if (!existing) {
      // Small delay so page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function acceptAll() {
    saveConsent({ notwendig: true, analyse: true, marketing: true, timestamp: Date.now() });
    setVisible(false);
  }

  function acceptSelected() {
    saveConsent({ notwendig: true, analyse, marketing, timestamp: Date.now() });
    setVisible(false);
  }

  function rejectAll() {
    saveConsent({ notwendig: true, analyse: false, marketing: false, timestamp: Date.now() });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
      className="fixed bottom-0 left-0 right-0 z-[9998] p-4 md:p-6 flex justify-center pointer-events-none"
    >
      <div
        className="w-full max-w-2xl bg-[--card] border border-[--border] rounded-2xl shadow-2xl p-5 pointer-events-auto"
        style={{ backdropFilter: "blur(8px)" }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Cookie className="h-5 w-5 text-[--primary] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2 id="cookie-banner-title" className="text-sm font-bold text-[--foreground]">
              Wir verwenden Cookies
            </h2>
            <p className="text-xs text-[--muted-foreground] mt-0.5 leading-relaxed">
              Wir nutzen Cookies und ähnliche Technologien, um Ihnen die bestmögliche Erfahrung auf xcare zu bieten.{" "}
              <Link href="/datenschutz" className="underline hover:text-[--foreground] transition-colors">
                Datenschutzerklärung
              </Link>
            </p>
          </div>
          <button
            onClick={rejectAll}
            aria-label="Nur notwendige Cookies akzeptieren und Banner schließen"
            className="text-[--muted-foreground] hover:text-[--foreground] transition-colors p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors mb-3"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Weniger anzeigen" : "Einstellungen anpassen"}
        </button>

        {expanded && (
          <div className="space-y-2.5 mb-4 bg-[--muted]/40 rounded-xl p-3.5">
            {/* Notwendig */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  id="cookie-notwendig"
                  checked={true}
                  disabled
                  className="h-4 w-4 rounded accent-[--primary] cursor-not-allowed opacity-70"
                />
              </div>
              <label htmlFor="cookie-notwendig" className="flex-1 cursor-not-allowed">
                <p className="text-xs font-semibold text-[--foreground]">Notwendig (immer aktiv)</p>
                <p className="text-xs text-[--muted-foreground] mt-0.5">
                  Session-Cookies für Anmeldung und grundlegende Funktionen der Plattform.
                </p>
              </label>
            </div>

            {/* Analyse */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  id="cookie-analyse"
                  checked={analyse}
                  onChange={(e) => setAnalyse(e.target.checked)}
                  className="h-4 w-4 rounded accent-[--primary] cursor-pointer"
                />
              </div>
              <label htmlFor="cookie-analyse" className="flex-1 cursor-pointer">
                <p className="text-xs font-semibold text-[--foreground]">Analyse</p>
                <p className="text-xs text-[--muted-foreground] mt-0.5">
                  Anonymisierte Nutzungsstatistiken (z.B. welche Seiten besucht werden) zur Verbesserung des Angebots.
                </p>
              </label>
            </div>

            {/* Marketing */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  id="cookie-marketing"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="h-4 w-4 rounded accent-[--primary] cursor-pointer"
                />
              </div>
              <label htmlFor="cookie-marketing" className="flex-1 cursor-pointer">
                <p className="text-xs font-semibold text-[--foreground]">Marketing</p>
                <p className="text-xs text-[--muted-foreground] mt-0.5">
                  Personalisierte Inhalte und Werbung auf Basis Ihrer Interessen.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={acceptAll}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-[--primary] text-white hover:bg-[--primary]/90 transition-colors"
          >
            Alle akzeptieren
          </button>
          {expanded ? (
            <button
              onClick={acceptSelected}
              className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-[--muted] text-[--foreground] hover:bg-[--border] transition-colors"
            >
              Auswahl speichern
            </button>
          ) : (
            <button
              onClick={rejectAll}
              className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-[--muted] text-[--foreground] hover:bg-[--border] transition-colors"
            >
              Nur notwendige
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Hook to check if a specific consent category was granted */
export function useConsent(category: "analyse" | "marketing"): boolean {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const consent = loadConsent();
    if (consent) setGranted(consent[category]);
  }, [category]);

  return granted;
}
