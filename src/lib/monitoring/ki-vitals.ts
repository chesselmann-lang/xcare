/**
 * KI-Vitals — Custom Performance Tracking für KI-Lotse & Co-Pilot (S317)
 *
 * Misst:
 *  - TTFB der Streaming-Antwort (Zeit von fetch() bis erstem Token)
 *  - Gesamtdauer des Streams (fetch() bis letztem Chunk)
 *
 * Sendet Custom Events an Vercel Analytics via `track()`.
 * Schreibt gleichzeitig `PerformanceMeasure`-Einträge ins Browser-Performance-Buffer,
 * damit Vercel Speed Insights und DevTools diese aufnehmen können.
 *
 * Wird nur im Browser ausgeführt — kein SSR-Risiko.
 */

import { track } from "@vercel/analytics/react";

export type KiVitalsOptions = {
  /** Lebenslage-Slug (z.B. "pflege", "behinderung") — dient als Dimension */
  lebenslage?: string;
  /** "lotse" | "copilot" — unterscheidet die KI-Features */
  feature?: "lotse" | "copilot";
};

export type KiVitalsMeasurement = {
  /** Zeitpunkt (performance.now()) kurz vor dem fetch()-Aufruf */
  fetchStart: number;
  /** Performance-Mark-Name für den Fetch-Start */
  markStart: string;
};

// ── Zähler für eindeutige Measure-Namen ──────────────────────────────────────
let _counter = 0;
function nextId() {
  return ++_counter;
}

/**
 * Markiert den Start einer KI-Anfrage.
 * Muss direkt vor dem fetch()-Aufruf aufgerufen werden.
 *
 * @returns Ein Measurement-Handle, das an `recordTtfb` und `recordComplete`
 *          übergeben werden muss.
 */
export function markKiRequestStart(opts: KiVitalsOptions = {}): KiVitalsMeasurement {
  const id = nextId();
  const feature = opts.feature ?? "lotse";
  const markStart = `ki-${feature}-start-${id}`;

  if (typeof performance !== "undefined") {
    performance.mark(markStart);
  }

  return {
    fetchStart: typeof performance !== "undefined" ? performance.now() : Date.now(),
    markStart,
  };
}

/**
 * Zeichnet die TTFB-Metrik auf (erstes Token angekommen).
 * Muss aufgerufen werden, sobald der erste nicht-leere Chunk aus dem
 * ReadableStream gelesen wurde.
 */
export function recordKiTtfb(
  measurement: KiVitalsMeasurement,
  opts: KiVitalsOptions = {}
): void {
  const ttfb = typeof performance !== "undefined"
    ? performance.now() - measurement.fetchStart
    : 0;

  const feature = opts.feature ?? "lotse";
  const measureName = `ki-${feature}-ttfb`;

  // PerformanceMeasure ins Browser-Buffer schreiben
  if (typeof performance !== "undefined") {
    try {
      performance.mark(`${measurement.markStart}-ttfb`);
      performance.measure(measureName, measurement.markStart, `${measurement.markStart}-ttfb`);
    } catch {
      // Ältere Browser unterstützen PerformanceMeasure u.U. nicht
    }
  }

  // Vercel Analytics Custom Event
  track("ki_ttfb", {
    feature,
    lebenslage: opts.lebenslage ?? "unknown",
    ttfb_ms: Math.round(ttfb),
  });
}

/**
 * Zeichnet die Gesamt-Stream-Dauer auf (letzter Chunk empfangen / Stream beendet).
 * Muss nach dem Ende des ReadableStream aufgerufen werden.
 */
export function recordKiStreamComplete(
  measurement: KiVitalsMeasurement,
  opts: KiVitalsOptions = {},
  totalChunks?: number
): void {
  const duration = typeof performance !== "undefined"
    ? performance.now() - measurement.fetchStart
    : 0;

  const feature = opts.feature ?? "lotse";
  const measureName = `ki-${feature}-stream-duration`;

  if (typeof performance !== "undefined") {
    try {
      performance.mark(`${measurement.markStart}-end`);
      performance.measure(measureName, measurement.markStart, `${measurement.markStart}-end`);
    } catch {
      // Ältere Browser
    }
  }

  track("ki_stream_complete", {
    feature,
    lebenslage: opts.lebenslage ?? "unknown",
    duration_ms: Math.round(duration),
    ...(totalChunks !== undefined ? { chunks: totalChunks } : {}),
  });
}

/**
 * Zeichnet einen KI-Fehler auf (fetch gescheitert oder Stream unterbrochen).
 */
export function recordKiError(
  measurement: KiVitalsMeasurement,
  opts: KiVitalsOptions = {},
  errorType?: string
): void {
  const timeToError = typeof performance !== "undefined"
    ? performance.now() - measurement.fetchStart
    : 0;

  track("ki_error", {
    feature: opts.feature ?? "lotse",
    lebenslage: opts.lebenslage ?? "unknown",
    time_to_error_ms: Math.round(timeToError),
    error_type: errorType ?? "unknown",
  });
}
