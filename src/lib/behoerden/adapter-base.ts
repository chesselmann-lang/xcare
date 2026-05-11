/**
 * Behördenschnittstellen-Adapter — Basis-Klasse
 * AP5: 8 Priority-1 Stubs für Behörden-APIs
 *
 * Jeder Adapter implementiert das BehoerdenAdapter-Interface.
 * In Production werden die echten API-Endpunkte eingebunden.
 * Aktuell: vollständige Stub-Implementierungen mit realistischen Testdaten.
 */

export interface BehoerdeAnfrageParams {
  /** Pseudonymisierte Nutzer-ID (SHA-256) */
  userPseudoId: string;
  /** Sozialversicherungsnummer (optional, nur für autorisierte Abfragen) */
  svnr?: string;
  /** Geburtsjahr */
  geburtsjahr?: number;
  /** PLZ */
  plz?: string;
  /** Freie Parameter je nach Behörde */
  extra?: Record<string, unknown>;
}

export interface BehoerdeAntwort<T = unknown> {
  ok: boolean;
  quelle: string;
  abgerufen_am: string;
  daten?: T;
  fehler?: string;
  hinweis?: string;
}

export abstract class BehoerdenAdapter<T = unknown> {
  abstract readonly name: string;
  abstract readonly beschreibung: string;
  abstract readonly api_url_prod: string;
  abstract readonly rechtsgrundlage: string;

  abstract abfragen(params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<T>>;

  protected stubAntwort(daten: T): BehoerdeAntwort<T> {
    return {
      ok: true,
      quelle: this.name,
      abgerufen_am: new Date().toISOString(),
      daten,
      hinweis: "STUB — Produktionsdaten werden nach Behörden-Onboarding verfügbar",
    };
  }

  protected fehlerAntwort(fehler: string): BehoerdeAntwort<T> {
    return {
      ok: false,
      quelle: this.name,
      abgerufen_am: new Date().toISOString(),
      fehler,
    };
  }
}
