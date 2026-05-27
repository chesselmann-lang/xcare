// ============================================================
// F33: KI-Pflegeberatung — System-Prompt & Tool-Definitionen
// ============================================================

export const PFLEGEBERATER_SYSTEM_PROMPT = `Du bist ein zertifizierter digitaler Pflegeberater der xcare-Plattform, der nach §7a SGB XI geschulten Standards arbeitet.

DEINE ROLLE:
- Du berätst pflegende Angehörige und Pflegebedürftige zu allen Fragen rund um Pflege in Deutschland
- Du kennst das deutsche Sozialrecht (SGB XI, SGB XII, SGB V, EStG) sehr gut
- Du bist empathisch, klar und konkret — keine schwammigen Antworten
- Du machst keine Ferndiagnosen und empfiehlst bei medizinischen Fragen immer einen Arzt
- Du kannst Anträge und Widerspruchs-Vorlagen erstellen

DEINE FÄHIGKEITEN (Tools):
- search_anbieter: Pflegeanbieter in der Nähe suchen
- check_ansprueche: Sozialleistungen für Pflegegrad prüfen
- generate_document: Antrag oder Widerspruchs-Brief generieren
- berechne_kosten: Eigenanteil und Steuervorteile berechnen
- schedule_followup: Erinnerung anlegen

KOMMUNIKATIONSSTIL:
- Schreibe auf Deutsch, klar und verständlich (B2-Niveau)
- Nutze Absätze und strukturiere lange Antworten mit **Überschriften**
- Gib konkrete nächste Schritte: "1. ... 2. ... 3. ..."
- Bei emotionalen Themen: erst Empathie, dann Information
- Wenn du etwas nicht weißt: sag es ehrlich und empfehle weiterführende Stellen

ESKALATION:
- Schlage eine Eskalation zu einem menschlichen Pflegeberater vor bei:
  - Widerspruchs- und Klageverfahren
  - Komplexen Familiensituationen
  - Akuten Krisen oder Notfällen
  - Wenn 3 Fragen nicht beantwortet werden konnten`

// ── Tool-Definitionen ─────────────────────────────────────────────────────────

export interface KiTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export const KI_TOOLS: KiTool[] = [
  {
    name: 'search_anbieter',
    description: 'Suche nach Pflegeanbietern in einer bestimmten PLZ oder Stadt',
    input_schema: {
      type: 'object',
      properties: {
        plz: { type: 'string', description: 'Postleitzahl' },
        leistungsart: {
          type: 'string',
          description: 'z.B. ambulante_pflege, tagespflege, kurzzeitpflege, verhinderungspflege',
        },
        radius_km: { type: 'number', description: 'Suchradius in Kilometern (Standard: 10)' },
      },
      required: ['plz'],
    },
  },
  {
    name: 'check_ansprueche',
    description: 'Prüfe welche Sozialleistungen für einen bestimmten Pflegegrad bestehen (Pflegegeld, Sachleistungen, Entlastungsbetrag, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        pflegegrad: { type: 'number', minimum: 1, maximum: 5 },
        wohnsituation: {
          type: 'string',
          enum: ['zuhause', 'heim'],
          description: 'Wohnt die pflegebedürftige Person zuhause oder im Heim?',
        },
      },
      required: ['pflegegrad'],
    },
  },
  {
    name: 'generate_document',
    description: 'Generiere ein Dokument (Antrag, Widerspruch, Vollmacht, Freistellungsantrag)',
    input_schema: {
      type: 'object',
      properties: {
        typ: {
          type: 'string',
          enum: ['pflegegeld_antrag', 'widerspruch', 'vollmacht', 'freistellung'],
        },
        personendaten: {
          type: 'object',
          description: 'Optionale Personendaten für die Vorlage (name, adresse, pflegekasse, etc.)',
        },
      },
      required: ['typ'],
    },
  },
  {
    name: 'berechne_kosten',
    description: 'Berechne den voraussichtlichen Eigenanteil für Pflegeleistungen und mögliche Steuervorteile nach §35a EStG',
    input_schema: {
      type: 'object',
      properties: {
        pflegegrad: { type: 'number', minimum: 1, maximum: 5 },
        leistungsart: {
          type: 'string',
          enum: ['ambulant', 'stationaer', 'tagespflege', 'kurzzeitpflege'],
        },
        monatliche_kosten_eur: {
          type: 'number',
          description: 'Tatsächliche monatliche Pflegekosten in Euro',
        },
      },
      required: ['pflegegrad', 'leistungsart'],
    },
  },
  {
    name: 'schedule_followup',
    description: 'Lege eine Erinnerung oder Folgeaufgabe für den Nutzer an',
    input_schema: {
      type: 'object',
      properties: {
        aufgabe: { type: 'string', description: 'Beschreibung der Aufgabe/Erinnerung' },
        faellig_am: { type: 'string', description: 'Fälligkeitsdatum im Format YYYY-MM-DD' },
      },
      required: ['aufgabe', 'faellig_am'],
    },
  },
]

// ── Anspruchs-Tabelle nach Pflegegrad (Stand 2025) ────────────────────────────

export interface PflegegradLeistungen {
  pflegegrad: number
  pflegegeld_eur: number          // § 37 SGB XI
  sachleistung_eur: number        // § 36 SGB XI
  entlastungsbetrag_eur: number   // § 45b SGB XI
  kurzzeitpflege_eur: number      // § 42 SGB XI
  verhinderungspflege_eur: number // § 39 SGB XI
  pflegehilfsmittel_eur: number   // § 40 SGB XI
  tagespflege_eur: number         // § 41 SGB XI
}

export const PFLEGEGRAD_LEISTUNGEN: PflegegradLeistungen[] = [
  {
    pflegegrad: 1,
    pflegegeld_eur: 0,
    sachleistung_eur: 0,
    entlastungsbetrag_eur: 125,
    kurzzeitpflege_eur: 0,
    verhinderungspflege_eur: 0,
    pflegehilfsmittel_eur: 40,
    tagespflege_eur: 0,
  },
  {
    pflegegrad: 2,
    pflegegeld_eur: 332,
    sachleistung_eur: 761,
    entlastungsbetrag_eur: 125,
    kurzzeitpflege_eur: 1774,
    verhinderungspflege_eur: 1685,
    pflegehilfsmittel_eur: 40,
    tagespflege_eur: 689,
  },
  {
    pflegegrad: 3,
    pflegegeld_eur: 573,
    sachleistung_eur: 1432,
    entlastungsbetrag_eur: 125,
    kurzzeitpflege_eur: 1774,
    verhinderungspflege_eur: 1685,
    pflegehilfsmittel_eur: 40,
    tagespflege_eur: 1298,
  },
  {
    pflegegrad: 4,
    pflegegeld_eur: 765,
    sachleistung_eur: 1778,
    entlastungsbetrag_eur: 125,
    kurzzeitpflege_eur: 1774,
    verhinderungspflege_eur: 1685,
    pflegehilfsmittel_eur: 40,
    tagespflege_eur: 1612,
  },
  {
    pflegegrad: 5,
    pflegegeld_eur: 947,
    sachleistung_eur: 2200,
    entlastungsbetrag_eur: 125,
    kurzzeitpflege_eur: 1774,
    verhinderungspflege_eur: 1685,
    pflegehilfsmittel_eur: 40,
    tagespflege_eur: 1995,
  },
]

// ── Dokument-Vorlagen ─────────────────────────────────────────────────────────

export type DokumentTyp = 'pflegegeld_antrag' | 'widerspruch' | 'vollmacht' | 'freistellung'

export function getDokumentVorlage(
  typ: DokumentTyp,
  personendaten?: Record<string, unknown>
): { titel: string; inhalt: string } {
  const name = (personendaten?.name as string) ?? '[Name]'
  const adresse = (personendaten?.adresse as string) ?? '[Straße, PLZ Ort]'
  const pflegekasse = (personendaten?.pflegekasse as string) ?? '[Name der Pflegekasse]'
  const datum = new Date().toLocaleDateString('de-DE')

  switch (typ) {
    case 'pflegegeld_antrag':
      return {
        titel: 'Antrag auf Pflegeleistungen nach SGB XI',
        inhalt: `${name}
${adresse}

${pflegekasse}
[Adresse der Pflegekasse]

${datum}

**Antrag auf Feststellung der Pflegebedürftigkeit und Gewährung von Pflegeleistungen**

Sehr geehrte Damen und Herren,

hiermit beantrage ich/beantragen wir für die pflegebedürftige Person

Name: ${name}
Geburtsdatum: [Geburtsdatum]
Versicherungsnummer: [Versicherungsnummer]

die Feststellung der Pflegebedürftigkeit gemäß §§ 14, 15 SGB XI sowie die Gewährung der entsprechenden Pflegeleistungen.

Die pflegebedürftige Person ist seit [Datum] auf Pflegeleistungen angewiesen. Eine ärztliche Bescheinigung liegt bei.

Ich bitte um:
1. Terminvereinbarung für die Begutachtung durch den MDK/Medicproof
2. Schriftliche Bestätigung des Eingangs dieses Antrags
3. Informationen über den weiteren Verlauf

Mit freundlichen Grüßen,

${name}

**Anlage:** Ärztliche Bescheinigung`,
      }

    case 'widerspruch':
      return {
        titel: 'Widerspruch gegen Pflegegrad-Einstufung',
        inhalt: `${name}
${adresse}

${pflegekasse}
[Adresse der Pflegekasse]

${datum}

**Widerspruch gegen den Bescheid vom [Datum des Bescheids]**
**Aktenzeichen: [Aktenzeichen]**

Sehr geehrte Damen und Herren,

gegen Ihren Bescheid vom [Datum] erhebe ich hiermit fristgerecht **Widerspruch**.

**Begründung:**

Die Einstufung in Pflegegrad [X] entspricht nicht dem tatsächlichen Pflegebedarf. Der tatsächliche Hilfebedarf in den folgenden Bereichen wurde nicht ausreichend berücksichtigt:

1. [Bereich 1 — z.B. Mobilität]: [Beschreibung der Einschränkungen]
2. [Bereich 2 — z.B. Selbstversorgung]: [Beschreibung der Einschränkungen]
3. [Weiterer Bereich]: [Beschreibung]

Ich beantrage daher die **Neubegutachtung** und Einstufung in mindestens Pflegegrad [Y].

**Ich beantrage außerdem:**
- Einsicht in das MDK-Gutachten (§ 25 Abs. 1 SGB X)
- Stellungnahme meines behandelnden Arztes/meiner Ärztin zu berücksichtigen

Mit freundlichen Grüßen,

${name}

**Anlagen:**
- Ärztliche Atteste / Facharztberichte
- Pflegetagebuch (optional)
- Stellungnahme der pflegenden Person`,
      }

    case 'vollmacht':
      return {
        titel: 'Pflegevollmacht',
        inhalt: `**VOLLMACHT**

Ich, ${name},
geboren am: [Geburtsdatum]
wohnhaft: ${adresse}

erteile hiermit

**Bevollmächtigte/r:** [Name der bevollmächtigten Person]
**Geburtsdatum:** [Geburtsdatum]
**Adresse:** [Adresse]

die Vollmacht, mich in allen Angelegenheiten der Pflege und Pflegeversicherung zu vertreten. Dies umfasst insbesondere:

- Antragstellung bei der Pflegekasse und anderen Sozialleistungsträgern
- Einreichung von Widersprüchen und Klagen
- Einsicht in Pflegegutachten und Bescheide
- Abschluss von Pflegeverträgen
- Kommunikation mit Pflegediensten, Pflegeheimen und Behörden

Diese Vollmacht gilt ab sofort und auf unbestimmte Zeit. Sie kann jederzeit widerrufen werden.

Ort, Datum: _________________, ${datum}

Unterschrift Vollmachtgeber/in: _________________
${name}

Unterschrift Bevollmächtigte/r: _________________
[Name]

*Hinweis: Für bestimmte Rechtsgeschäfte kann eine notarielle Beglaubigung erforderlich sein.*`,
      }

    case 'freistellung':
      return {
        titel: 'Antrag auf Freistellung zur Pflege (§ 3 PflegeZG)',
        inhalt: `${name}
${adresse}

[Name des Arbeitgebers]
[Adresse des Arbeitgebers]

${datum}

**Antrag auf kurzzeitige Arbeitsverhinderung / Pflegezeit gemäß §§ 2, 3 Pflegezeitgesetz (PflegeZG)**

Sehr geehrte Damen und Herren,

hiermit beantrage ich gemäß § 3 Abs. 1 PflegeZG Pflegezeit für die Pflege meines/meiner nahen Angehörigen:

**Pflegebedürftige Person:**
Name: [Name des/der Pflegebedürftigen]
Verwandtschaftsverhältnis: [z.B. Mutter, Vater]
Pflegegrad: [Pflegegrad 1–5]

**Zeitraum:** vom [Datum] bis [Datum]
**Art der Inanspruchnahme:** ☐ Vollständige Freistellung ☐ Teilweise Reduzierung auf ___ Stunden/Woche

**Begründung:**
Die pflegebedürftige Person benötigt ab dem oben genannten Datum intensive Unterstützung. Die häusliche Pflege kann nicht durch andere Personen oder Pflegedienste sichergestellt werden.

Eine Bescheinigung der Pflegebedürftigkeit füge ich bei.

Mit freundlichen Grüßen,

${name}

**Anlage:** Bescheinigung über Pflegebedürftigkeit / Pflegegradnachweis`,
      }
  }
}
