'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  Search, MapPin, Heart, Star, Phone, Mail, Globe, ChevronDown, ChevronUp,
  CheckSquare, Square, X, Info, Euro, FileText, Calendar, Clock, Users,
  Building2, Shield, AlertCircle, CheckCircle2, Trash2, Edit3, ExternalLink,
  Filter, SlidersHorizontal, ArrowUpDown, BookOpen, ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  berechneEigenanteil,
  formatMonatlicheKosten,
  PFLEGEKASSE_LEISTUNG_CENT,
  SCHONVERMOEGEN_SINGLE_CENT,
  type EigenanteilBerechnung,
} from '@/lib/heimsuche/eigenanteil'

// ============================================================
// Types
// ============================================================

export interface Pflegeheim {
  id: string
  name: string
  traeger: string | null
  traeger_typ: 'freigemeinnuetzig' | 'privat' | 'oeffentlich' | null
  strasse: string | null
  hausnummer: string | null
  plz: string
  ort: string
  bundesland: string | null
  lat: number | null
  lng: number | null
  telefon: string | null
  email: string | null
  webseite: string | null
  plaetze_gesamt: number | null
  plaetze_verfuegbar: number | null
  wartezeit_monate: number | null
  spezialisierungen: string[] | null
  sprachen: string[] | null
  eigenanteil_pflegekosten_cent: number | null
  kosten_unterkunft_cent: number | null
  kosten_verpflegung_cent: number | null
  kosten_investition_cent: number | null
  eigenanteil_gesamt_cent: number | null
  mdk_note: number | null
  qualitaet_pflege: number | null
  qualitaet_alltag: number | null
  letzte_pruefung: string | null
  einzelzimmer_verfuegbar: boolean
  haustiere_erlaubt: boolean
  besuchszeiten: string | null
  verpflegung_detail: string | null
  aktivitaeten: string[] | null
}

export interface MerklistenEintrag {
  id: string
  notizen: string | null
  kontaktiert_am: string | null
  warteliste_angemeldet: boolean
  besichtigungs_termin: string | null
  erstellt_am: string
  pflegeheime: Pflegeheim
}

interface HeimSucheClientProps {
  initialHeime: Pflegeheim[]
  initialMerkliste: MerklistenEintrag[]
}

// ============================================================
// Constants
// ============================================================

const TRAEGER_TYP_LABELS: Record<string, string> = {
  freigemeinnuetzig: 'Freigemeinnützig',
  privat: 'Privat',
  oeffentlich: 'Öffentlich',
}

const TRAEGER_TYP_COLORS: Record<string, string> = {
  freigemeinnuetzig: 'bg-blue-100 text-blue-800',
  privat: 'bg-purple-100 text-purple-800',
  oeffentlich: 'bg-green-100 text-green-800',
}

const SPEZIALISIERUNG_LABELS: Record<string, string> = {
  demenz: 'Demenz',
  beatmung: 'Beatmung',
  wachkoma: 'Wachkoma',
  kurzzeitpflege: 'Kurzzeitpflege',
}

const RATGEBER_ITEMS = [
  {
    title: 'Was kostet ein Pflegeheim wirklich?',
    icon: Euro,
    content: `Die Kosten eines Pflegeheims setzen sich aus vier Komponenten zusammen:

1. **Pflegekosten (einrichtungseinheitlicher Eigenanteil):** Seit 2022 zahlen alle Heimbewohner denselben Betrag unabhängig vom Pflegegrad. Bundesweit lag dieser 2026 durchschnittlich bei ca. 1.600–2.400 EUR/Monat.

2. **Unterkunft:** Miete für das Zimmer inkl. Nebenkosten. Typisch: 700–1.000 EUR/Monat.

3. **Verpflegung:** Alle Mahlzeiten und Getränke. Typisch: 450–700 EUR/Monat.

4. **Ausbildungsumlage (Investitionskosten):** Deckung der Gebäude- und Ausstattungskosten. Typisch: 300–600 EUR/Monat.

Die **Pflegekasse zahlt einen fixen Zuschuss** nach Pflegegrad (§43 SGB XI). Alles darüber hinaus ist Ihr Eigenanteil.`,
  },
  {
    title: 'Pflegekasse zahlt — §43 SGB XI',
    icon: Shield,
    content: `Die Pflegeversicherung übernimmt bei vollstationärer Pflege einen festen Betrag pro Pflegegrad (Stand 2026):

| Pflegegrad | Kassenzuschuss/Monat |
|---|---|
| PG 1 | 0 EUR (kein Anspruch) |
| PG 2 | 770 EUR |
| PG 3 | 1.262 EUR |
| PG 4 | 1.775 EUR |
| PG 5 | 2.005 EUR |

Zusätzlich: Ab 2022 gibt es den **Leistungszuschlag** (§43c SGB XI), der den einrichtungseinheitlichen Eigenanteil im ersten Jahr um 5 %, im zweiten Jahr um 25 %, ab dem dritten Jahr um 45 % und ab dem vierten Jahr um 70 % reduziert.`,
  },
  {
    title: 'Sozialhilfe: Wenn das Geld nicht reicht (§65 SGB XII)',
    icon: AlertCircle,
    content: `Wenn Einkommen und Vermögen nicht ausreichen, übernimmt das Sozialamt die Kosten im Rahmen der **Hilfe zur Pflege (§65 SGB XII)**.

**Geschützt bleiben:**
- Schonvermögen: 10.000 EUR (Einzelperson) / 20.000 EUR (Ehepaar)
- Grundfreibetrag vom Einkommen (§82 SGB XII)
- Das Haus (unter bestimmten Umständen)

**Wichtig:** Kinder sind grundsätzlich nicht mehr zur Zahlung verpflichtet, wenn ihr eigenes Jahreseinkommen unter 100.000 EUR liegt (§94 SGB XII).

Beantragen Sie Sozialhilfe rechtzeitig beim zuständigen Sozialamt — rückwirkend ist dies nur eingeschränkt möglich.`,
  },
  {
    title: 'Der richtige Zeitpunkt: Wann mit der Suche beginnen?',
    icon: Clock,
    content: `**So früh wie möglich — idealerweise 6–12 Monate vorher.**

Die Wartezeiten für einen Heimplatz betragen in beliebten Einrichtungen oft 3–12 Monate. Folgendes sollten Sie früh klären:

- Pflegegrad beantragen (Bearbeitungszeit 5 Wochen)
- Region und Präferenzen festlegen (Nähe zu Familie, städtisch/ländlich)
- Budget berechnen (mit unserem Eigenanteil-Rechner)
- Besichtigungstermine vereinbaren (mind. 3–5 Heime besichtigen)
- Auf Wartelisten anmelden (mehrere gleichzeitig möglich)

Im **Notfall** (z. B. nach Krankenhausaufenthalt) können Heime oft kurzfristig eine Übergangslösung anbieten.`,
  },
  {
    title: 'Checkliste Heimbesichtigung (15 Punkte)',
    icon: ClipboardList,
    content: `Nutzen Sie diese Checkliste bei jedem Besichtigungstermin:

**Atmosphäre & Hygiene**
☐ Erster Eindruck: Sauberkeit und Geruch im Eingangsbereich
☐ Zustand der Bewohnerzimmer (Größe, Licht, Lüftung)
☐ Sauberkeit der Gemeinschaftsräume und Toiletten
☐ Außenanlage / Garten zugänglich?

**Personal & Betreuung**
☐ Personalschlüssel: Wieviele Pflegekräfte pro Bewohner?
☐ Fluktuation: Wie lange sind Mitarbeiter durchschnittlich dabei?
☐ Fachkraftquote (mind. 50 % Pflegefachkräfte)
☐ Betreuungsangebote im Tagesablauf

**Verpflegung & Alltag**
☐ Probeessen möglich? Qualität und Auswahl
☐ Flexibilität bei Essenszeiten
☐ Tagesstruktur und Aktivitätenangebot

**Organisation & Kosten**
☐ Vertragsbedingungen und Kündigungsfristen (gesetzl. max. 14 Tage)
☐ Heimaufsicht: Letzte MDK-Note / Qualitätsbericht einsehen
☐ Kostenaufstellung schriftlich anfordern
☐ Wartezeit und Aufnahmeverfahren klären`,
  },
]

// ============================================================
// Helper functions
// ============================================================

function centToEuro(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function mdkNoteLabel(note: number): string {
  if (note <= 1.5) return 'Sehr gut'
  if (note <= 2.5) return 'Gut'
  if (note <= 3.5) return 'Befriedigend'
  if (note <= 4.5) return 'Ausreichend'
  return 'Mangelhaft'
}

function mdkNoteColor(note: number): string {
  if (note <= 1.5) return 'bg-green-100 text-green-800'
  if (note <= 2.5) return 'bg-lime-100 text-lime-800'
  if (note <= 3.5) return 'bg-yellow-100 text-yellow-800'
  if (note <= 4.5) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

function qualitaetBarColor(q: number): string {
  if (q >= 85) return 'bg-green-500'
  if (q >= 70) return 'bg-lime-500'
  if (q >= 55) return 'bg-yellow-500'
  return 'bg-orange-500'
}

// ============================================================
// Sub-components
// ============================================================

function QualitaetsBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[--muted-foreground] mb-1">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 bg-[--muted] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${qualitaetBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

interface HeimCardProps {
  heim: Pflegeheim
  pflegegrad: number
  merkliste: Set<string>
  compareList: string[]
  onMerklisteToggle: (heimId: string) => void
  onCompareToggle: (heimId: string) => void
}

function HeimCard({
  heim,
  pflegegrad,
  merkliste,
  compareList,
  onMerklisteToggle,
  onCompareToggle,
}: HeimCardProps) {
  const [expanded, setExpanded] = useState(false)

  const kassenleistung = PFLEGEKASSE_LEISTUNG_CENT[pflegegrad] ?? 0
  const eigenanteil = Math.max(0, (heim.eigenanteil_gesamt_cent ?? 0) - kassenleistung)
  const isMerkliste = merkliste.has(heim.id)
  const isCompare = compareList.includes(heim.id)
  const canAddCompare = compareList.length < 3 || isCompare

  const adresse = [heim.strasse, heim.hausnummer].filter(Boolean).join(' ')
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${heim.name}, ${adresse}, ${heim.plz} ${heim.ort}`)}`

  return (
    <Card className={`border transition-all ${isCompare ? 'ring-2 ring-[--primary]' : ''}`}>
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-[--foreground] text-base leading-tight">{heim.name}</h3>
              {heim.traeger_typ && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TRAEGER_TYP_COLORS[heim.traeger_typ] ?? 'bg-gray-100 text-gray-700'}`}>
                  {TRAEGER_TYP_LABELS[heim.traeger_typ]}
                </span>
              )}
            </div>
            {heim.traeger && (
              <p className="text-xs text-[--muted-foreground] mb-1">{heim.traeger}</p>
            )}
            <div className="flex items-center gap-1 text-sm text-[--muted-foreground]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{heim.plz} {heim.ort}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => canAddCompare && onCompareToggle(heim.id)}
              disabled={!canAddCompare}
              title={isCompare ? 'Aus Vergleich entfernen' : 'Zum Vergleich hinzufügen (max. 3)'}
              className={`p-2 rounded-lg border transition-colors text-sm font-medium
                ${isCompare
                  ? 'bg-[--primary] text-white border-[--primary]'
                  : canAddCompare
                    ? 'border-[--border] text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary]'
                    : 'border-[--border] text-[--muted] cursor-not-allowed opacity-50'
                }`}
            >
              {isCompare ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onMerklisteToggle(heim.id)}
              title={isMerkliste ? 'Von Merkliste entfernen' : 'Zur Merkliste hinzufügen'}
              className={`p-2 rounded-lg border transition-colors
                ${isMerkliste
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'border-[--border] text-[--muted-foreground] hover:text-red-500 hover:border-red-200'
                }`}
            >
              <Heart className={`h-4 w-4 ${isMerkliste ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Cost + quality row */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {/* Cost */}
          <div className="bg-[--muted]/40 rounded-xl p-3">
            <p className="text-xs text-[--muted-foreground] mb-1">Ihr Eigenanteil (PG {pflegegrad})</p>
            <p className="text-2xl font-bold text-[--foreground]">{centToEuro(eigenanteil)}</p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">/Monat nach Pflegekasse</p>
            <div className="mt-2 text-xs text-[--muted-foreground] space-y-0.5">
              <div className="flex justify-between">
                <span>Gesamtkosten</span>
                <span>{centToEuro(heim.eigenanteil_gesamt_cent ?? 0)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>– Pflegekasse</span>
                <span>–{centToEuro(kassenleistung)}</span>
              </div>
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            {heim.mdk_note != null && (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${mdkNoteColor(heim.mdk_note)}`}>
                  {heim.mdk_note.toFixed(1)}
                </span>
                <span className="text-xs text-[--muted-foreground]">{mdkNoteLabel(heim.mdk_note)}</span>
              </div>
            )}
            {heim.qualitaet_pflege != null && (
              <QualitaetsBar value={heim.qualitaet_pflege} label="Pflegequalität" />
            )}
            {heim.qualitaet_alltag != null && (
              <QualitaetsBar value={heim.qualitaet_alltag} label="Alltagsgestaltung" />
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {heim.spezialisierungen?.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {SPEZIALISIERUNG_LABELS[s] ?? s}
            </Badge>
          ))}
          {heim.plaetze_verfuegbar != null && heim.plaetze_verfuegbar > 0 && (
            <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
              {heim.plaetze_verfuegbar} Platz{heim.plaetze_verfuegbar !== 1 ? 'e' : ''} frei
            </Badge>
          )}
          {heim.wartezeit_monate != null && heim.wartezeit_monate > 0 && (
            <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              {heim.wartezeit_monate} Monate Wartezeit
            </Badge>
          )}
          {heim.haustiere_erlaubt && (
            <Badge variant="secondary" className="text-xs">Haustiere erlaubt</Badge>
          )}
          {heim.einzelzimmer_verfuegbar && (
            <Badge variant="secondary" className="text-xs">Einzelzimmer</Badge>
          )}
        </div>

        {/* Expand / collapse */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-sm text-[--primary] hover:underline"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Weniger anzeigen' : 'Details anzeigen'}
        </button>

        {/* Expanded accordion */}
        {expanded && (
          <div className="mt-4 border-t border-[--border] pt-4 space-y-4">
            {/* Cost breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-[--foreground] mb-2">Kostenaufschlüsselung</h4>
              <div className="text-sm space-y-1">
                {[
                  ['Einrichtungseinheitlicher Eigenanteil Pflege', heim.eigenanteil_pflegekosten_cent],
                  ['Unterkunft', heim.kosten_unterkunft_cent],
                  ['Verpflegung', heim.kosten_verpflegung_cent],
                  ['Investitionskosten / Ausbildungsumlage', heim.kosten_investition_cent],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-[--muted-foreground]">
                    <span>{label as string}</span>
                    <span>{val != null ? centToEuro(val as number) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visit / food / activities */}
            {heim.besuchszeiten && (
              <div>
                <h4 className="text-sm font-semibold text-[--foreground] mb-1">Besuchszeiten</h4>
                <p className="text-sm text-[--muted-foreground]">{heim.besuchszeiten}</p>
              </div>
            )}
            {heim.verpflegung_detail && (
              <div>
                <h4 className="text-sm font-semibold text-[--foreground] mb-1">Verpflegung</h4>
                <p className="text-sm text-[--muted-foreground]">{heim.verpflegung_detail}</p>
              </div>
            )}
            {heim.aktivitaeten && heim.aktivitaeten.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[--foreground] mb-2">Aktivitäten</h4>
                <div className="flex flex-wrap gap-1.5">
                  {heim.aktivitaeten.map((a) => (
                    <Badge key={a} variant="secondary" className="text-xs capitalize">
                      {a.replace(/ae/g, 'ä').replace(/ue/g, 'ü').replace(/oe/g, 'ö')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-[--foreground] mb-2">Kontakt</h4>
              <div className="space-y-1.5 text-sm">
                {heim.telefon && (
                  <a href={`tel:${heim.telefon}`} className="flex items-center gap-2 text-[--primary] hover:underline">
                    <Phone className="h-4 w-4" /> {heim.telefon}
                  </a>
                )}
                {heim.email && (
                  <a href={`mailto:${heim.email}`} className="flex items-center gap-2 text-[--primary] hover:underline">
                    <Mail className="h-4 w-4" /> {heim.email}
                  </a>
                )}
                {heim.webseite && (
                  <a href={heim.webseite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[--primary] hover:underline">
                    <Globe className="h-4 w-4" /> Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[--primary] hover:underline">
                  <MapPin className="h-4 w-4" /> Auf Google Maps ansehen
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Quality info */}
            {heim.letzte_pruefung && (
              <p className="text-xs text-[--muted-foreground]">
                Letzte MDK-Prüfung: {new Date(heim.letzte_pruefung).toLocaleDateString('de-DE')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Compare Modal
// ============================================================

interface CompareModalProps {
  heime: Pflegeheim[]
  pflegegrad: number
  onClose: () => void
}

function CompareModal({ heime, pflegegrad, onClose }: CompareModalProps) {
  const kassenleistung = PFLEGEKASSE_LEISTUNG_CENT[pflegegrad] ?? 0

  const rows: Array<{ label: string; values: (string | React.ReactNode)[] }> = [
    {
      label: 'Träger',
      values: heime.map((h) => h.traeger ?? '—'),
    },
    {
      label: 'Trägertyp',
      values: heime.map((h) => (h.traeger_typ ? TRAEGER_TYP_LABELS[h.traeger_typ] : '—')),
    },
    {
      label: 'Standort',
      values: heime.map((h) => `${h.plz} ${h.ort}`),
    },
    {
      label: `Eigenanteil (PG ${pflegegrad})`,
      values: heime.map((h) => (
        <strong key={h.id} className="text-[--primary]">
          {centToEuro(Math.max(0, (h.eigenanteil_gesamt_cent ?? 0) - kassenleistung))}
        </strong>
      )),
    },
    {
      label: 'Gesamtkosten',
      values: heime.map((h) => centToEuro(h.eigenanteil_gesamt_cent ?? 0)),
    },
    {
      label: 'Pflegekosten-EA',
      values: heime.map((h) => centToEuro(h.eigenanteil_pflegekosten_cent ?? 0)),
    },
    {
      label: 'Unterkunft',
      values: heime.map((h) => centToEuro(h.kosten_unterkunft_cent ?? 0)),
    },
    {
      label: 'Verpflegung',
      values: heime.map((h) => centToEuro(h.kosten_verpflegung_cent ?? 0)),
    },
    {
      label: 'Investitionskosten',
      values: heime.map((h) => centToEuro(h.kosten_investition_cent ?? 0)),
    },
    {
      label: 'MDK-Note',
      values: heime.map((h) =>
        h.mdk_note != null ? `${h.mdk_note.toFixed(1)} (${mdkNoteLabel(h.mdk_note)})` : '—'
      ),
    },
    {
      label: 'Pflegequalität (QI)',
      values: heime.map((h) => (h.qualitaet_pflege != null ? `${h.qualitaet_pflege}/100` : '—')),
    },
    {
      label: 'Alltagsgestaltung (QI)',
      values: heime.map((h) => (h.qualitaet_alltag != null ? `${h.qualitaet_alltag}/100` : '—')),
    },
    {
      label: 'Gesamt-Plätze',
      values: heime.map((h) => (h.plaetze_gesamt != null ? `${h.plaetze_gesamt}` : '—')),
    },
    {
      label: 'Freie Plätze',
      values: heime.map((h) =>
        h.plaetze_verfuegbar != null ? `${h.plaetze_verfuegbar}` : '—'
      ),
    },
    {
      label: 'Wartezeit',
      values: heime.map((h) =>
        h.wartezeit_monate != null ? `${h.wartezeit_monate} Monate` : 'keine Angabe'
      ),
    },
    {
      label: 'Spezialisierungen',
      values: heime.map((h) =>
        h.spezialisierungen?.map((s) => SPEZIALISIERUNG_LABELS[s] ?? s).join(', ') ?? '—'
      ),
    },
    {
      label: 'Haustiere',
      values: heime.map((h) => (h.haustiere_erlaubt ? 'Erlaubt' : 'Nicht erlaubt')),
    },
    {
      label: 'Einzelzimmer',
      values: heime.map((h) => (h.einzelzimmer_verfuegbar ? 'Verfügbar' : '—')),
    },
    {
      label: 'Besuchszeiten',
      values: heime.map((h) => h.besuchszeiten ?? '—'),
    },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[--background] rounded-2xl shadow-2xl w-full max-w-5xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <h2 className="text-xl font-bold text-[--foreground]">Heimvergleich</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[--muted] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--border]">
                <th className="text-left p-4 text-[--muted-foreground] font-medium w-40">Kriterium</th>
                {heime.map((h) => (
                  <th key={h.id} className="text-left p-4 font-semibold text-[--foreground]">
                    {h.name}
                    <div className="text-xs font-normal text-[--muted-foreground]">{h.plz} {h.ort}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-[--border] ${i % 2 === 0 ? 'bg-[--muted]/20' : ''}`}
                >
                  <td className="p-4 text-[--muted-foreground] font-medium">{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="p-4 text-[--foreground]">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-[--border] text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[--primary] text-white rounded-lg hover:bg-[--primary]/90 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Eigenanteil Rechner
// ============================================================

interface EigenanteilRechnerProps {
  heime: Pflegeheim[]
}

function EigenanteilRechner({ heime }: EigenanteilRechnerProps) {
  const [pflegegrad, setPflegegrad] = useState(3)
  const [einkommenEuro, setEinkommenEuro] = useState('')
  const [vermoegenEuro, setVermoegenEuro] = useState('')
  const [selectedHeimId, setSelectedHeimId] = useState('')
  const [result, setResult] = useState<EigenanteilBerechnung | null>(null)
  const [showResult, setShowResult] = useState(false)

  const selectedHeim = heime.find((h) => h.id === selectedHeimId)

  function handleBerechnen() {
    if (!selectedHeim) return

    const berechnung = berechneEigenanteil({
      pflegegrad,
      heim_eigenanteil_pflegekosten_cent: selectedHeim.eigenanteil_pflegekosten_cent ?? 0,
      heim_unterkunft_cent: selectedHeim.kosten_unterkunft_cent ?? 0,
      heim_verpflegung_cent: selectedHeim.kosten_verpflegung_cent ?? 0,
      heim_investition_cent: selectedHeim.kosten_investition_cent ?? 0,
      einkommen_monatlich_cent: Math.round(parseFloat(einkommenEuro || '0') * 100),
      vermoegen_cent: Math.round(parseFloat(vermoegenEuro || '0') * 100),
    })
    setResult(berechnung)
    setShowResult(true)
  }

  return (
    <Card className="border-2 border-[--primary]/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Euro className="h-5 w-5 text-[--primary]" />
          Eigenanteil-Rechner
        </CardTitle>
        <p className="text-sm text-[--muted-foreground]">
          Berechnen Sie Ihren persönlichen Kostenanteil nach §43 SGB XI
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pflegegrad */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1.5">
              Pflegegrad
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPflegegrad(pg)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors
                    ${pflegegrad === pg
                      ? 'bg-[--primary] text-white border-[--primary]'
                      : 'border-[--border] text-[--muted-foreground] hover:border-[--primary]'
                    }`}
                >
                  {pg}
                </button>
              ))}
            </div>
            <p className="text-xs text-[--muted-foreground] mt-1">
              Pflegekasse zahlt: {centToEuro(PFLEGEKASSE_LEISTUNG_CENT[pflegegrad] ?? 0)}/Monat
            </p>
          </div>

          {/* Heim auswählen */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1.5">
              Pflegeheim auswählen
            </label>
            <select
              value={selectedHeimId}
              onChange={(e) => setSelectedHeimId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
            >
              <option value="">— Heim aus Suchergebnissen wählen —</option>
              {heime.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.ort})
                </option>
              ))}
            </select>
          </div>

          {/* Einkommen */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1.5">
              Monatliches Einkommen (EUR)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={einkommenEuro}
              onChange={(e) => setEinkommenEuro(e.target.value)}
              placeholder="z. B. 1.400"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
            <p className="text-xs text-[--muted-foreground] mt-1">Rente, Versorgungsbezüge etc.</p>
          </div>

          {/* Vermögen */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1.5">
              Vermögen gesamt (EUR)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={vermoegenEuro}
              onChange={(e) => setVermoegenEuro(e.target.value)}
              placeholder="z. B. 25.000"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
            <p className="text-xs text-[--muted-foreground] mt-1">
              Schonvermögen {centToEuro(SCHONVERMOEGEN_SINGLE_CENT)} ist geschützt
            </p>
          </div>
        </div>

        <button
          onClick={handleBerechnen}
          disabled={!selectedHeimId}
          className="w-full py-2.5 bg-[--primary] text-white font-semibold rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Eigenanteil berechnen
        </button>

        {/* Result */}
        {showResult && result && selectedHeim && (
          <div className="mt-2 rounded-xl border border-[--border] overflow-hidden">
            <div className="bg-[--muted]/40 px-4 py-3 border-b border-[--border]">
              <p className="font-semibold text-[--foreground]">{selectedHeim.name}</p>
            </div>
            <div className="p-4 space-y-3">
              {/* Main breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[--muted-foreground]">Gesamtkosten Heim</span>
                  <span className="font-medium">{centToEuro(result.heim_eigenanteil_gesamt)}/Monat</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>– Pflegekasse §43 SGB XI (PG {pflegegrad})</span>
                  <span className="font-medium">–{centToEuro(result.pflegekasse_leistung)}</span>
                </div>
                <div className="flex justify-between border-t border-[--border] pt-2 font-semibold text-base">
                  <span>= Ihr Eigenanteil</span>
                  <span className="text-[--primary]">{centToEuro(result.zu_zahlender_eigenanteil)}/Monat</span>
                </div>
              </div>

              {/* §35a */}
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                  <FileText className="h-4 w-4" />
                  §35a EStG Steuerermäßigung
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>20 % auf Unterkunft + Verpflegung</span>
                  <span className="font-semibold">–{centToEuro(result.steuerersparnis_35a)}/Monat</span>
                </div>
                <div className="flex justify-between text-blue-800 font-semibold mt-1 pt-1 border-t border-blue-200">
                  <span>Effektive Netto-Belastung</span>
                  <span>{centToEuro(result.nettobelastung_cent)}/Monat</span>
                </div>
              </div>

              {/* Sozialhilfe */}
              {result.sozialhilfe_anspruch && (
                <div className="bg-amber-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Sozialhilfeanspruch wahrscheinlich
                  </div>
                  <p className="text-amber-700">
                    Einkommen und Vermögen reichen möglicherweise nicht aus. Das Sozialamt (§65 SGB XII)
                    könnte ca. <strong>{centToEuro(result.sozialhilfe_betrag)}/Monat</strong> übernehmen.
                    Bitte beim zuständigen Sozialamt beantragen.
                  </p>
                </div>
              )}
              {!result.sozialhilfe_anspruch && (
                <div className="bg-green-50 rounded-lg p-3 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-green-800">
                    Ihr Einkommen und Vermögen reichen voraussichtlich aus, den Eigenanteil zu decken.
                  </p>
                </div>
              )}

              <p className="text-xs text-[--muted-foreground] mt-2">
                * Vereinfachte Schätzung. Für eine genaue Berechnung wenden Sie sich an Ihre Pflegekasse oder einen unabhängigen Pflegeberater (§7a SGB XI).
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Merkliste Tab
// ============================================================

interface MerklisteTabProps {
  merkliste: MerklistenEintrag[]
  onRefresh: () => void
}

function MerklisteTab({ merkliste, onRefresh }: MerklisteTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotizen, setEditNotizen] = useState('')
  const [editBesichtigung, setEditBesichtigung] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleRemove(heimId: string) {
    await fetch(`/api/heimsuche/merkliste?heim_id=${heimId}`, { method: 'DELETE' })
    onRefresh()
  }

  async function handleSaveNotizen(eintrag: MerklistenEintrag) {
    setSaving(true)
    await fetch('/api/heimsuche/merkliste', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heim_id: eintrag.pflegeheime.id,
        notizen: editNotizen,
        besichtigungs_termin: editBesichtigung || null,
      }),
    })
    setSaving(false)
    setEditingId(null)
    onRefresh()
  }

  async function handleWartelisteToggle(eintrag: MerklistenEintrag) {
    await fetch('/api/heimsuche/merkliste', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heim_id: eintrag.pflegeheime.id,
        warteliste_angemeldet: !eintrag.warteliste_angemeldet,
      }),
    })
    onRefresh()
  }

  async function handleKontaktiert(eintrag: MerklistenEintrag) {
    const today = new Date().toISOString().split('T')[0]
    await fetch('/api/heimsuche/merkliste', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heim_id: eintrag.pflegeheime.id,
        kontaktiert_am: today,
      }),
    })
    onRefresh()
  }

  if (merkliste.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart className="h-12 w-12 text-[--muted] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[--foreground] mb-2">Noch keine Heime gespeichert</h3>
        <p className="text-[--muted-foreground] text-sm">
          Klicken Sie auf das Herz-Symbol bei einem Suchergebnis, um es zur Merkliste hinzuzufügen.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {merkliste.map((eintrag) => {
        const h = eintrag.pflegeheime
        const isEditing = editingId === eintrag.id
        return (
          <Card key={eintrag.id} className="border">
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[--foreground]">{h.name}</h3>
                  <p className="text-xs text-[--muted-foreground]">{h.plz} {h.ort}</p>
                </div>
                <button
                  onClick={() => handleRemove(h.id)}
                  className="p-1.5 text-[--muted-foreground] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Von Merkliste entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-1.5">
                {eintrag.kontaktiert_am && (
                  <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                    <Phone className="h-3 w-3 mr-1" />
                    Kontaktiert {new Date(eintrag.kontaktiert_am).toLocaleDateString('de-DE')}
                  </Badge>
                )}
                {eintrag.besichtigungs_termin && (
                  <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                    <Calendar className="h-3 w-3 mr-1" />
                    Besichtigung {new Date(eintrag.besichtigungs_termin).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                )}
                {eintrag.warteliste_angemeldet && (
                  <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Warteliste
                  </Badge>
                )}
              </div>

              {/* Notes */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editNotizen}
                    onChange={(e) => setEditNotizen(e.target.value)}
                    placeholder="Ihre persönlichen Notizen zu diesem Heim..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                  />
                  <div>
                    <label className="block text-xs text-[--muted-foreground] mb-1">Besichtigungstermin</label>
                    <input
                      type="datetime-local"
                      value={editBesichtigung}
                      onChange={(e) => setEditBesichtigung(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveNotizen(eintrag)}
                      disabled={saving}
                      className="flex-1 py-1.5 bg-[--primary] text-white text-sm font-medium rounded-lg hover:bg-[--primary]/90 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Speichern...' : 'Speichern'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-1.5 border border-[--border] text-[--muted-foreground] text-sm rounded-lg hover:bg-[--muted] transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {eintrag.notizen && (
                    <p className="text-sm text-[--muted-foreground] italic bg-[--muted]/30 rounded-lg p-2">
                      {eintrag.notizen}
                    </p>
                  )}
                  {!eintrag.notizen && (
                    <p className="text-xs text-[--muted-foreground] italic">Noch keine Notizen</p>
                  )}
                </>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-[--border]">
                <button
                  onClick={() => {
                    setEditingId(eintrag.id)
                    setEditNotizen(eintrag.notizen ?? '')
                    setEditBesichtigung(
                      eintrag.besichtigungs_termin
                        ? new Date(eintrag.besichtigungs_termin).toISOString().slice(0, 16)
                        : ''
                    )
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[--border] rounded-lg text-[--muted-foreground] hover:bg-[--muted] transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Notizen bearbeiten
                </button>
                {!eintrag.kontaktiert_am && (
                  <button
                    onClick={() => handleKontaktiert(eintrag)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[--border] rounded-lg text-[--muted-foreground] hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Als kontaktiert markieren
                  </button>
                )}
                <button
                  onClick={() => handleWartelisteToggle(eintrag)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors
                    ${eintrag.warteliste_angemeldet
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      : 'border-[--border] text-[--muted-foreground] hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                    }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {eintrag.warteliste_angemeldet ? 'Warteliste: Angemeldet' : 'Warteliste anmelden'}
                </button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============================================================
// Ratgeber Tab
// ============================================================

function RatgeberTab() {
  const [openItem, setOpenItem] = useState<number | null>(0)

  return (
    <div className="space-y-3 max-w-3xl">
      {RATGEBER_ITEMS.map((item, i) => {
        const Icon = item.icon
        const isOpen = openItem === i
        return (
          <Card key={i} className="border overflow-hidden">
            <button
              onClick={() => setOpenItem(isOpen ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-[--muted]/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[--primary]/10 rounded-lg">
                  <Icon className="h-4 w-4 text-[--primary]" />
                </div>
                <span className="font-semibold text-[--foreground]">{item.title}</span>
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5 text-[--muted-foreground]" /> : <ChevronDown className="h-5 w-5 text-[--muted-foreground]" />}
            </button>
            {isOpen && (
              <CardContent className="px-5 pb-5 pt-0">
                <div className="prose prose-sm max-w-none text-[--muted-foreground] leading-relaxed whitespace-pre-line">
                  {item.content}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function HeimSucheClient({ initialHeime, initialMerkliste }: HeimSucheClientProps) {
  const [activeTab, setActiveTab] = useState<'suche' | 'merkliste' | 'ratgeber'>('suche')

  // Search state
  const [plzOrt, setPlzOrt] = useState('')
  const [pflegegrad, setPflegegrad] = useState(3)
  const [maxEigenanteil, setMaxEigenanteil] = useState(4000)
  const [traegerTypen, setTraegerTypen] = useState<Set<string>>(new Set())
  const [spezialisierungen, setSpezialisierungen] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState('eigenanteil_asc')
  const [loading, setLoading] = useState(false)
  const [heime, setHeime] = useState<Pflegeheim[]>(initialHeime)
  const [searched, setSearched] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)

  // Merkliste state
  const [merkliste, setMerkliste] = useState<MerklistenEintrag[]>(initialMerkliste)
  const [merklisteIds, setMerklisteIds] = useState<Set<string>>(
    new Set(initialMerkliste.map((e) => e.pflegeheime.id))
  )

  // Compare state
  const [compareList, setCompareList] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)

  // Search function
  const handleSearch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const trimmed = plzOrt.trim()
      if (trimmed) {
        if (/^\d/.test(trimmed)) {
          params.set('plz', trimmed)
        } else {
          params.set('ort', trimmed)
        }
      }
      params.set('pflegegrad', String(pflegegrad))
      params.set('max_eigenanteil', String(maxEigenanteil))
      params.set('sort', sort)
      traegerTypen.forEach((t) => params.append('traeger_typ', t))
      spezialisierungen.forEach((s) => params.append('spezialisierung', s))

      const res = await fetch(`/api/heimsuche?${params.toString()}`)
      const json = await res.json()
      setHeime(json.data ?? [])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [plzOrt, pflegegrad, maxEigenanteil, sort, traegerTypen, spezialisierungen])

  // Merkliste toggle
  const handleMerklisteToggle = useCallback(async (heimId: string) => {
    if (merklisteIds.has(heimId)) {
      await fetch(`/api/heimsuche/merkliste?heim_id=${heimId}`, { method: 'DELETE' })
      setMerklisteIds((prev) => { const n = new Set(prev); n.delete(heimId); return n })
      setMerkliste((prev) => prev.filter((e) => e.pflegeheime.id !== heimId))
    } else {
      const res = await fetch('/api/heimsuche/merkliste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heim_id: heimId }),
      })
      const json = await res.json()
      if (json.data) {
        setMerklisteIds((prev) => new Set([...prev, heimId]))
        const heim = heime.find((h) => h.id === heimId)
        if (heim) {
          setMerkliste((prev) => [{
            id: json.data.id,
            notizen: null,
            kontaktiert_am: null,
            warteliste_angemeldet: false,
            besichtigungs_termin: null,
            erstellt_am: new Date().toISOString(),
            pflegeheime: heim,
          }, ...prev])
        }
      }
    }
  }, [merklisteIds, heime])

  // Compare toggle
  const handleCompareToggle = useCallback((heimId: string) => {
    setCompareList((prev) => {
      if (prev.includes(heimId)) return prev.filter((id) => id !== heimId)
      if (prev.length >= 3) return prev
      return [...prev, heimId]
    })
  }, [])

  // Refresh merkliste from API
  const refreshMerkliste = useCallback(async () => {
    const res = await fetch('/api/heimsuche/merkliste')
    const json = await res.json()
    if (json.data) {
      setMerkliste(json.data)
      setMerklisteIds(new Set(json.data.map((e: MerklistenEintrag) => e.pflegeheime.id)))
    }
  }, [])

  const compareHeime = useMemo(
    () => heime.filter((h) => compareList.includes(h.id)),
    [heime, compareList]
  )

  const traegerOptionen = [
    { value: 'freigemeinnuetzig', label: 'Freigemeinnützig' },
    { value: 'privat', label: 'Privat' },
    { value: 'oeffentlich', label: 'Öffentlich' },
  ]

  const spezialisierungOptionen = [
    { value: 'demenz', label: 'Demenz' },
    { value: 'beatmung', label: 'Beatmung' },
    { value: 'wachkoma', label: 'Wachkoma' },
    { value: 'kurzzeitpflege', label: 'Kurzzeitpflege' },
  ]

  const tabs = [
    { id: 'suche' as const, label: 'Heimsuche', icon: Search },
    { id: 'merkliste' as const, label: `Meine Merkliste${merkliste.length > 0 ? ` (${merkliste.length})` : ''}`, icon: Heart },
    { id: 'ratgeber' as const, label: 'Ratgeber', icon: BookOpen },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-[--muted]/40 p-1 rounded-xl w-full max-w-xl">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all
              ${activeTab === id
                ? 'bg-[--background] text-[--foreground] shadow-sm'
                : 'text-[--muted-foreground] hover:text-[--foreground]'
              }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ---- TAB: SUCHE ---- */}
      {activeTab === 'suche' && (
        <div className="space-y-6">
          {/* Search bar */}
          <Card className="border">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" />
                  <input
                    type="text"
                    value={plzOrt}
                    onChange={(e) => setPlzOrt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="PLZ oder Ort (z. B. 10785 oder Berlin)"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
                  />
                </div>
                {/* Pflegegrad */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[--muted-foreground] whitespace-nowrap shrink-0">Pflegegrad</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setPflegegrad(pg)}
                        className={`w-9 h-9 text-sm font-semibold rounded-lg border transition-colors
                          ${pflegegrad === pg
                            ? 'bg-[--primary] text-white border-[--primary]'
                            : 'border-[--border] text-[--muted-foreground] hover:border-[--primary]'
                          }`}
                      >
                        {pg}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[--primary] text-white font-semibold rounded-lg hover:bg-[--primary]/90 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <Search className="h-4 w-4" />
                  {loading ? 'Suche...' : 'Suchen'}
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-6">
            {/* Filter Sidebar */}
            <div className="w-64 shrink-0 hidden md:block">
              <Card className="border sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  {/* Max Eigenanteil */}
                  <div>
                    <label className="block text-xs font-medium text-[--foreground] mb-2">
                      Max. Eigenanteil: {maxEigenanteil.toLocaleString('de-DE')} €/Monat
                    </label>
                    <input
                      type="range"
                      min={500}
                      max={4000}
                      step={50}
                      value={maxEigenanteil}
                      onChange={(e) => setMaxEigenanteil(Number(e.target.value))}
                      className="w-full accent-[--primary]"
                    />
                    <div className="flex justify-between text-xs text-[--muted-foreground] mt-1">
                      <span>500 €</span>
                      <span>4.000 €</span>
                    </div>
                  </div>

                  {/* Trägertyp */}
                  <div>
                    <p className="text-xs font-medium text-[--foreground] mb-2">Trägertyp</p>
                    <div className="space-y-2">
                      {traegerOptionen.map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={traegerTypen.has(value)}
                            onChange={(e) => {
                              const n = new Set(traegerTypen)
                              e.target.checked ? n.add(value) : n.delete(value)
                              setTraegerTypen(n)
                            }}
                            className="rounded accent-[--primary]"
                          />
                          <span className="text-sm text-[--foreground]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Spezialisierungen */}
                  <div>
                    <p className="text-xs font-medium text-[--foreground] mb-2">Spezialisierungen</p>
                    <div className="space-y-2">
                      {spezialisierungOptionen.map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={spezialisierungen.has(value)}
                            onChange={(e) => {
                              const n = new Set(spezialisierungen)
                              e.target.checked ? n.add(value) : n.delete(value)
                              setSpezialisierungen(n)
                            }}
                            className="rounded accent-[--primary]"
                          />
                          <span className="text-sm text-[--foreground]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-xs font-medium text-[--foreground] mb-2">
                      <ArrowUpDown className="inline h-3 w-3 mr-1" />
                      Sortierung
                    </label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-[--border] bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]"
                    >
                      <option value="eigenanteil_asc">Eigenanteil ↑ (günstigste zuerst)</option>
                      <option value="eigenanteil_desc">Eigenanteil ↓ (teuerste zuerst)</option>
                      <option value="qualitaet_desc">Qualität ↓ (beste zuerst)</option>
                      <option value="name_asc">Name A–Z</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full py-2 bg-[--primary] text-white text-sm font-semibold rounded-lg hover:bg-[--primary]/90 disabled:opacity-60 transition-colors"
                  >
                    Filter anwenden
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="md:hidden flex items-center gap-2 text-sm text-[--muted-foreground] border border-[--border] rounded-lg px-3 py-2 hover:bg-[--muted] transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filter {filterOpen ? 'ausblenden' : 'anzeigen'}
              </button>

              {/* Mobile filter panel */}
              {filterOpen && (
                <div className="md:hidden bg-[--muted]/20 border border-[--border] rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[--foreground] mb-2">
                      Max. Eigenanteil: {maxEigenanteil.toLocaleString('de-DE')} €/Monat
                    </label>
                    <input
                      type="range" min={500} max={4000} step={50}
                      value={maxEigenanteil}
                      onChange={(e) => setMaxEigenanteil(Number(e.target.value))}
                      className="w-full accent-[--primary]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-[--foreground] mb-2">Trägertyp</p>
                      {traegerOptionen.map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer mb-1.5">
                          <input type="checkbox" checked={traegerTypen.has(value)}
                            onChange={(e) => { const n = new Set(traegerTypen); e.target.checked ? n.add(value) : n.delete(value); setTraegerTypen(n) }}
                            className="rounded accent-[--primary]"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[--foreground] mb-2">Spezialisierungen</p>
                      {spezialisierungOptionen.map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer mb-1.5">
                          <input type="checkbox" checked={spezialisierungen.has(value)}
                            onChange={(e) => { const n = new Set(spezialisierungen); e.target.checked ? n.add(value) : n.delete(value); setSpezialisierungen(n) }}
                            className="rounded accent-[--primary]"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Results header */}
              {searched && (
                <p className="text-sm text-[--muted-foreground]">
                  {heime.length === 0
                    ? 'Keine Heime gefunden. Bitte passen Sie Ihre Filter an.'
                    : `${heime.length} Pflegeheim${heime.length !== 1 ? 'e' : ''} gefunden`}
                </p>
              )}
              {!searched && (
                <p className="text-sm text-[--muted-foreground]">
                  {heime.length} Pflegeheime in ganz Deutschland — suchen Sie nach PLZ oder Ort.
                </p>
              )}

              {heime.map((heim) => (
                <HeimCard
                  key={heim.id}
                  heim={heim}
                  pflegegrad={pflegegrad}
                  merkliste={merklisteIds}
                  compareList={compareList}
                  onMerklisteToggle={handleMerklisteToggle}
                  onCompareToggle={handleCompareToggle}
                />
              ))}

              {heime.length === 0 && !loading && (
                <div className="text-center py-16">
                  <Building2 className="h-12 w-12 text-[--muted] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[--foreground] mb-2">
                    {searched ? 'Keine Treffer' : 'Heimsuche starten'}
                  </h3>
                  <p className="text-[--muted-foreground] text-sm">
                    {searched
                      ? 'Versuchen Sie eine andere PLZ, einen anderen Ort oder passen Sie die Filter an.'
                      : 'Geben Sie eine PLZ oder einen Ort ein und klicken Sie auf Suchen.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Eigenanteil Rechner */}
          <EigenanteilRechner heime={heime.length > 0 ? heime : initialHeime} />

          {/* Compare sticky bar */}
          {compareList.length >= 2 && (
            <div className="fixed bottom-0 left-0 right-0 bg-[--background] border-t border-[--border] shadow-2xl p-4 z-40">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-[--primary]" />
                  <span className="font-medium text-[--foreground] text-sm">
                    {compareList.length} Heim{compareList.length !== 1 ? 'e' : ''} zum Vergleich ausgewählt
                  </span>
                  <span className="text-xs text-[--muted-foreground]">(max. 3)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCompareList([])}
                    className="px-3 py-2 text-sm border border-[--border] rounded-lg text-[--muted-foreground] hover:bg-[--muted] transition-colors"
                  >
                    Auswahl löschen
                  </button>
                  <button
                    onClick={() => setShowCompare(true)}
                    className="px-4 py-2 bg-[--primary] text-white text-sm font-semibold rounded-lg hover:bg-[--primary]/90 transition-colors"
                  >
                    Jetzt vergleichen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- TAB: MERKLISTE ---- */}
      {activeTab === 'merkliste' && (
        <MerklisteTab merkliste={merkliste} onRefresh={refreshMerkliste} />
      )}

      {/* ---- TAB: RATGEBER ---- */}
      {activeTab === 'ratgeber' && <RatgeberTab />}

      {/* Compare Modal */}
      {showCompare && compareHeime.length >= 2 && (
        <CompareModal
          heime={compareHeime}
          pflegegrad={pflegegrad}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  )
}
