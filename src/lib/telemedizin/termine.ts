/**
 * Telemedizin-Hilfsfunktionen
 * Unterstützt Terminplanung, Formatierung und Video-Link-Generierung
 */

// ── Fachgebiete ───────────────────────────────────────────────────────────────

export const FACHGEBIETE_LISTE: string[] = [
  'Allgemeinmedizin',
  'Innere Medizin',
  'Kardiologie',
  'Neurologie',
  'Psychiatrie',
  'Psychotherapie',
  'Orthopädie',
  'Dermatologie',
  'Urologie',
  'Gynäkologie',
  'Pädiatrie',
  'Augenheilkunde',
  'HNO',
  'Endokrinologie',
  'Gastroenterologie',
  'Pneumologie',
  'Rheumatologie',
  'Onkologie',
  'Pflegemedizin',
  'Geriatrie',
  'Palliativmedizin',
  'Schmerztherapie',
  'Sportmedizin',
  'Arbeitsmedizin',
];

// ── Terminplanung ─────────────────────────────────────────────────────────────

/**
 * Berechnet die empfohlene Sitzungsdauer in Minuten basierend auf dem Konsultationstyp.
 * - Kurzkonsultation / Folgegespräch → 20 min
 * - Standard (allgemein, innere Medizin, etc.) → 30 min
 * - Psychotherapie / Psychiatrie / spezialisierte Fachbereiche → 45 min
 * - Erstgespräch / komplexe Beratung → 60 min
 */
export function berechneTerminDauer(typ: string): number {
  const lower = typ.toLowerCase();

  if (
    lower.includes('kurz') ||
    lower.includes('folge') ||
    lower.includes('kontrolle') ||
    lower.includes('rezept')
  ) {
    return 20;
  }

  if (
    lower.includes('psychother') ||
    lower.includes('psychiatr') ||
    lower.includes('geriatrie') ||
    lower.includes('palliativ') ||
    lower.includes('onkolog') ||
    lower.includes('komplex')
  ) {
    return 45;
  }

  if (
    lower.includes('erst') ||
    lower.includes('umfassend') ||
    lower.includes('gutachten') ||
    lower.includes('zweitmeinung')
  ) {
    return 60;
  }

  return 30;
}

// ── Formatierung ──────────────────────────────────────────────────────────────

/**
 * Formatiert Datum und Uhrzeit für deutsche Darstellung.
 * Beispiel: "Dienstag, 27. Mai 2026 um 10:00 Uhr"
 */
export function formatTermin(datum: Date, uhrzeit: string): string {
  const datumFormatiert = datum.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `${datumFormatiert} um ${uhrzeit} Uhr`;
}

// ── Video-Link ────────────────────────────────────────────────────────────────

/**
 * Generiert einen Daily.co-kompatiblen Video-Raum-Link für einen Termin.
 * In der Produktion würde dies über die Daily.co REST API erstellt.
 */
export function generiereVideoLink(terminId: string): string {
  // Stabiler, abgeleiteter Raumname aus der Termin-ID (erste 12 Zeichen ohne Bindestriche)
  const raumName = `xcare-${terminId.replace(/-/g, '').slice(0, 12)}`;
  return `https://xcare.daily.co/${raumName}`;
}
