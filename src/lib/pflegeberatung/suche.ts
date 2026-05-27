/**
 * §7a SGB XI Pflegeberatung – Hilfsfunktionen und Typen
 */

// ── Bundesländer ──────────────────────────────────────────────────────────────

export const BUNDESLAENDER: string[] = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

// ── Beratungsarten ────────────────────────────────────────────────────────────

export const BERATUNGSARTEN: string[] = [
  'telefon',
  'video',
  'hausbesuch',
  'praesenz',
];

// ── Filter-Interface ──────────────────────────────────────────────────────────

export interface PflegeberatungsFilter {
  plz?: string;
  ort?: string;
  bundesland?: string;
  traeger_typ?: string;
  hausbesuche?: boolean;
  video_beratung?: boolean;
}

// ── Haversine-Formel ──────────────────────────────────────────────────────────

/**
 * Berechnet die Luftlinien-Entfernung zwischen zwei geografischen Koordinaten
 * mithilfe der Haversine-Formel.
 * @returns Entfernung in Kilometern (gerundet auf 1 Nachkommastelle)
 */
export function berechneEntfernung(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Erdradius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanz = R * c;
  return Math.round(distanz * 10) / 10;
}

// ── Öffnungszeiten ────────────────────────────────────────────────────────────

/**
 * Bereinigt und normalisiert einen Öffnungszeiten-String für die Anzeige.
 * Entfernt überflüssige Leerzeichen und normalisiert Satzzeichen.
 */
export function formatOeffnungszeiten(zeiten: string): string {
  if (!zeiten || zeiten.trim() === '') return 'Öffnungszeiten nicht bekannt';
  return zeiten.trim().replace(/\s{2,}/g, ' ').replace(/;\s*/g, '\n');
}

// ── Träger-Typ-Labels ─────────────────────────────────────────────────────────

/**
 * Gibt das deutschsprachige Label für einen Träger-Typ zurück.
 */
export function getTraegerTypLabel(typ: string): string {
  const labels: Record<string, string> = {
    pflegekasse: 'Pflegekasse',
    vdk: 'VdK Sozialverband',
    sozialverband: 'Sozialverband',
    kommune: 'Kommunal',
    sonstige: 'Freie Träger',
  };
  return labels[typ] ?? typ;
}
