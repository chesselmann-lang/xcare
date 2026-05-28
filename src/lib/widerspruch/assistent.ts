// F47: Pflegegrad-Widerspruch-Assistent

export interface Widerspruchsverfahren {
  id?: string
  user_id?: string
  aktueller_pflegegrad?: number
  beantragter_pflegegrad?: number
  bescheid_datum: string
  widerspruchsfrist?: string
  begutachtung_datum?: string
  gutachter_name?: string
  gutachten_erhalten: boolean
  titel: string
  begruendung_kategorien: string[]
  begruendung_freitext?: string
  status: 'vorbereitung' | 'eingereicht' | 'in_pruefung' | 'widerspruchsausschuss' | 'klageverfahren' | 'abgeschlossen_erfolg' | 'abgeschlossen_ablehnung'
  einreichungsdatum?: string
  pflegekasse_name?: string
  pflegekasse_adresse?: string
  aktenzeichen?: string
  ergebnis_pflegegrad?: number
  ergebnis_datum?: string
  ergebnis_notizen?: string
  dokumente_checkliste: Record<string, boolean>
  notizen?: string
  erstellt_am?: string
  aktualisiert_am?: string
}

export interface WiderspruchArgument {
  id?: string
  widerspruch_id: string
  user_id?: string
  kategorie: string
  argument: string
  belege?: string
  prioritaet: 1 | 2 | 3
  erstellt_am?: string
}

export const VERFAHRENSSTATUS: { value: Widerspruchsverfahren['status']; label: string; farbe: string; schritt: number }[] = [
  { value: 'vorbereitung',          label: 'Vorbereitung',           farbe: '#6366f1', schritt: 1 },
  { value: 'eingereicht',           label: 'Eingereicht',            farbe: '#3b82f6', schritt: 2 },
  { value: 'in_pruefung',           label: 'In Prüfung',             farbe: '#f59e0b', schritt: 3 },
  { value: 'widerspruchsausschuss', label: 'Widerspruchsausschuss',  farbe: '#f97316', schritt: 4 },
  { value: 'klageverfahren',        label: 'Klageverfahren (SG)',    farbe: '#ef4444', schritt: 5 },
  { value: 'abgeschlossen_erfolg',  label: 'Abgeschlossen – Erfolg', farbe: '#22c55e', schritt: 6 },
  { value: 'abgeschlossen_ablehnung', label: 'Abgeschlossen – Abgelehnt', farbe: '#6b7280', schritt: 6 },
]

export const BEGRUENDUNGS_KATEGORIEN: { value: string; label: string; icon: string; beschreibung: string }[] = [
  {
    value: 'kognitive_einschraenkungen',
    label: 'Kognitive Einschränkungen',
    icon: '🧠',
    beschreibung: 'Demenz, Gedächtnisstörungen, Orientierungslosigkeit wurden nicht ausreichend berücksichtigt'
  },
  {
    value: 'mobilitaet',
    label: 'Mobilität & Beweglichkeit',
    icon: '🦽',
    beschreibung: 'Einschränkungen bei Gehen, Treppensteigen, Lageveränderungen wurden unterschätzt'
  },
  {
    value: 'selbstversorgung',
    label: 'Selbstversorgung',
    icon: '🍽️',
    beschreibung: 'Hilfe bei Körperpflege, Essen, Trinken, An-/Auskleiden wurde nicht korrekt bewertet'
  },
  {
    value: 'verhaltensweisen',
    label: 'Verhaltensweisen & psychische Probleme',
    icon: '💭',
    beschreibung: 'Herausforderndes Verhalten, Angst, Aggression, Apathie nicht berücksichtigt'
  },
  {
    value: 'krankheitsbewältigung',
    label: 'Umgang mit krankheitsbedingten Anforderungen',
    icon: '💊',
    beschreibung: 'Medikamentengabe, Verbandswechsel, Arztbesuche, Diabetes-Management unberücksichtigt'
  },
  {
    value: 'aussenbereich',
    label: 'Außerhäusliche Aktivitäten',
    icon: '🚶',
    beschreibung: 'Einschränkungen außerhalb der Wohnung wurden nicht ausreichend gewürdigt'
  },
  {
    value: 'haushaltsführung',
    label: 'Haushaltsführung',
    icon: '🏠',
    beschreibung: 'Unfähigkeit zur eigenständigen Haushaltsführung wurde unterschätzt'
  },
  {
    value: 'gutachten_fehler',
    label: 'Fehler im Gutachten',
    icon: '📋',
    beschreibung: 'Sachliche Fehler, fehlende Informationen oder falsche Beobachtungen im MDK-Gutachten'
  },
  {
    value: 'zeitdruck_begutachtung',
    label: 'Unzureichende Begutachtung',
    icon: '⏱️',
    beschreibung: 'Begutachtung war zu kurz, wichtige Aspekte wurden nicht erfragt'
  },
  {
    value: 'pflegedokumentation',
    label: 'Pflegedokumentation als Beweis',
    icon: '📖',
    beschreibung: 'Vorliegende Pflegedokumentation, Pflegetagebuch widerspricht Gutachten'
  },
]

export const DOKUMENTE_CHECKLISTE: { key: string; label: string; pflicht: boolean }[] = [
  { key: 'ablehnungsbescheid', label: 'Ablehnungs-/Einstufungsbescheid (Kopie)', pflicht: true },
  { key: 'widerspruchsschreiben', label: 'Widerspruchsschreiben (unterschrieben)', pflicht: true },
  { key: 'mdk_gutachten', label: 'MDK-Gutachten (falls erhalten)', pflicht: false },
  { key: 'aerztliche_atteste', label: 'Aktuelle ärztliche Atteste/Arztberichte', pflicht: false },
  { key: 'pflegetagebuch', label: 'Pflegetagebuch der letzten 2 Wochen', pflicht: false },
  { key: 'krankenhausberichte', label: 'Krankenhausberichte/Entlassbriefe', pflicht: false },
  { key: 'medikamentenplan', label: 'Aktueller Medikationsplan', pflicht: false },
  { key: 'vollmacht', label: 'Vollmacht/Vorsorgevollmacht (falls Vertreter)', pflicht: false },
  { key: 'zeugen', label: 'Zeugenaussagen von Angehörigen/Pflegepersonen', pflicht: false },
  { key: 'fotos', label: 'Fotos (z.B. bei Wunden, Hilfsmitteln)', pflicht: false },
]

export const ARGUMENT_VORLAGEN: Record<string, string[]> = {
  kognitive_einschraenkungen: [
    'Die diagnostizierte Demenz (Stadium: ___) führt zu permanenter Desorientierung und erfordert kontinuierliche Beaufsichtigung, die im Gutachten nicht berücksichtigt wurde.',
    'Nächtliche Unruhezustände und Weglauftendenz machen rund-um-die-Uhr-Betreuung erforderlich, was einem Pflegegrad ___ entspricht.',
    'Die kognitiven Einschränkungen wurden während der Begutachtung aufgrund eines lichten Moments unterschätzt; der alltägliche Zustand ist deutlich schlechter.',
  ],
  mobilitaet: [
    'Die Pflegeperson kann keine Treppe mehr steigen; die Begutachtung fand im Erdgeschoss statt, was die wahre Mobilität verfälschte.',
    'Die im Gutachten beschriebene Mobilität entspricht nicht dem Alltag; ohne Hilfsmittel und Assistenz ist ein sicheres Gehen nicht möglich.',
    'Der Rollstuhl ist dauerhaft notwendig; die kurze Gehstrecke während der Begutachtung ist nicht repräsentativ.',
  ],
  selbstversorgung: [
    'Das An- und Auskleiden erfordert vollständige Übernahme; dies wurde im Gutachten als "nur Teilhilfe nötig" eingestuft, was nicht der Realität entspricht.',
    'Die Körperpflege kann ausschließlich mit umfassender Unterstützung durchgeführt werden; das Gutachten unterschätzt den tatsächlichen Hilfebedarf.',
    'Aufgrund von ___ ist eigenständige Nahrungsaufnahme nicht möglich; täglich wird vollständige Assistenz beim Essen benötigt.',
  ],
  gutachten_fehler: [
    'Das Gutachten enthält sachliche Fehler: ___ wird als ___ beschrieben, tatsächlich liegt ___ vor.',
    'Wesentliche Diagnosen (___) wurden im Gutachten nicht berücksichtigt, obwohl sie dem Gutachter mitgeteilt wurden.',
    'Die Begutachtungszeit von ___ Minuten war nicht ausreichend, um alle Einschränkungen zu erfassen.',
  ],
  pflegedokumentation: [
    'Das beigefügte Pflegetagebuch dokumentiert einen durchschnittlichen täglichen Pflegeaufwand von ___ Stunden, was mit dem Gutachten nicht vereinbar ist.',
    'Die anliegenden ärztlichen Atteste von Dr. ___ belegen einen Pflegebedarf, der einem Pflegegrad ___ entspricht.',
    'Die Pflegedokumentation der ambulanten Pflegekraft belegt den täglichen Hilfeumfang und widerspricht der Einschätzung des Gutachters.',
  ],
}

export const PFLEGEGRAD_BESCHREIBUNG: Record<number, string> = {
  0: 'Kein Pflegegrad (keine erhebliche Beeinträchtigung)',
  1: 'PG 1: Geringe Beeinträchtigungen der Selbstständigkeit (12,5–26 Punkte)',
  2: 'PG 2: Erhebliche Beeinträchtigungen der Selbstständigkeit (27–47 Punkte)',
  3: 'PG 3: Schwere Beeinträchtigungen der Selbstständigkeit (47,5–69 Punkte)',
  4: 'PG 4: Schwerste Beeinträchtigungen der Selbstständigkeit (70–89 Punkte)',
  5: 'PG 5: Schwerste Beeinträchtigungen mit besonderen Anforderungen (90–100 Punkte)',
}

export function berechneFrist(bescheidDatum: string): string {
  const d = new Date(bescheidDatum)
  d.setDate(d.getDate() + 28) // 4 Wochen
  return d.toISOString().split('T')[0]
}

export function fristStatus(frist?: string): { tage: number; kritisch: boolean; abgelaufen: boolean } | null {
  if (!frist) return null
  const d = new Date(frist)
  const today = new Date(); today.setHours(0,0,0,0)
  const tage = Math.round((d.getTime() - today.getTime()) / 86400000)
  return { tage, kritisch: tage <= 7 && tage >= 0, abgelaufen: tage < 0 }
}

export function generiereWiderspruchsbrief(v: Widerspruchsverfahren, argumente: WiderspruchArgument[]): string {
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const frist = v.widerspruchsfrist
    ? new Date(v.widerspruchsfrist).toLocaleDateString('de-DE')
    : 'innerhalb der gesetzlichen Frist von 4 Wochen ab Bescheiddatum'

  const argTexte = argumente
    .sort((a, b) => a.prioritaet - b.prioritaet)
    .map((a, i) => {
      let t = `${i + 1}. ${a.kategorie}\n   ${a.argument}`
      if (a.belege) t += `\n   Belege: ${a.belege}`
      return t
    })
    .join('\n\n')

  return `Absender:
[Name]
[Straße, Nr.]
[PLZ Ort]
[Telefon/E-Mail]

Versicherungs-Nr.: [Ihre Versicherungsnummer]
Aktenzeichen: ${v.aktenzeichen ?? '[Aktenzeichen aus Bescheid]'}

${v.pflegekasse_name ?? '[Name der Pflegekasse]'}
${v.pflegekasse_adresse ?? '[Adresse der Pflegekasse]'}

${heute}

WIDERSPRUCH
gegen den Bescheid vom ${new Date(v.bescheid_datum).toLocaleDateString('de-DE')}
betreffend: Einstufung in Pflegegrad ${v.aktueller_pflegegrad ?? '[eingestufter PG]'}

Sehr geehrte Damen und Herren,

hiermit lege ich fristgerecht Widerspruch gegen den o.g. Bescheid ein, mit dem mir Pflegegrad ${v.aktueller_pflegegrad ?? '[PG]'} zuerkannt wurde. Ich beantrage die Einstufung in Pflegegrad ${v.beantragter_pflegegrad ?? '[beantragter PG]'}.

Die Einstufung entspricht nicht meinem tatsächlichen Pflegebedarf. Zur Begründung führe ich Folgendes aus:

${argTexte || '[Hier Begründungen eintragen]'}

${v.begruendung_freitext ? `Ergänzende Ausführungen:\n${v.begruendung_freitext}\n` : ''}
Ich bitte Sie, das MDK-Gutachten vom ${v.begutachtung_datum ? new Date(v.begutachtung_datum).toLocaleDateString('de-DE') : '[Datum]'} einer erneuten Prüfung zu unterziehen und eine Neubegutachtung zu veranlassen.

Bitte bestätigen Sie den Eingang dieses Widerspruchs schriftlich.

Mit freundlichen Grüßen

________________________
[Unterschrift]
[Name]

Anlagen:
${DOKUMENTE_CHECKLISTE.filter(d => d.pflicht).map(d => `- ${d.label}`).join('\n')}
[Weitere beigefügte Dokumente]
`
}

export function leererWiderspruch(): Widerspruchsverfahren {
  const heute = new Date().toISOString().split('T')[0]
  return {
    bescheid_datum: heute,
    widerspruchsfrist: berechneFrist(heute),
    gutachten_erhalten: false,
    titel: 'Widerspruch MDK-Gutachten',
    begruendung_kategorien: [],
    status: 'vorbereitung',
    dokumente_checkliste: {}
  }
}
