// F29: Pflegetagebuch V2 — KI-Mustererkennung (server-side, no Claude API needed)

export interface VitalTrend {
  metrik: 'blutdruck' | 'puls' | 'temperatur' | 'blutzucker' | 'gewicht' | 'sauerstoff'
  einheit: string
  werte: Array<{ datum: string; wert: number; systolisch?: number; diastolisch?: number }>
  trend: 'steigend' | 'fallend' | 'stabil' | 'schwankend'
  alarm: boolean
  alarm_grund?: string
}

export interface TagesbuchMuster {
  schmerz_trend: 'besser' | 'schlechter' | 'stabil' | 'nicht_erfasst'
  stimmungs_durchschnitt: number | null // 1-5
  schlaf_durchschnitt: number | null    // hours
  mahlzeit_qualitaet: 'gut' | 'maessig' | 'schlecht' | 'nicht_erfasst'
  fluessigkeit_durchschnitt_ml: number | null
  aktivitaets_niveau: 'aktiv' | 'eingeschraenkt' | 'bettlaegerig' | 'nicht_erfasst'
}

// Alarm thresholds for vital signs
export const ALARMGRENZEN = {
  blutdruck_sys_hoch: 180,  // hypertensive crisis
  blutdruck_sys_niedrig: 90, // hypotension
  puls_hoch: 100,
  puls_niedrig: 50,
  temperatur_fieber: 38.5,
  sauerstoff_niedrig: 92,
  blutzucker_hoch: 300,
  blutzucker_niedrig: 70,
} as const

type EintragInput = {
  datum: string
  kategorie: string
  schmerz_skala?: number | null
  stimmung_skala?: number | null
  schlaf_stunden?: number | null
  fluessigkeit_ml?: number | null
  blutdruck_systolisch?: number | null
  blutdruck_diastolisch?: number | null
  puls?: number | null
  temperatur?: number | null
  blutzucker?: number | null
  sauerstoffsaettigung?: number | null
  gewicht?: number | null
  appetit?: string | null
  aktivitaets_niveau?: string | null
}

// Simple linear regression slope
function steigung(werte: number[]): number {
  if (werte.length < 2) return 0
  const n = werte.length
  const sumX = (n * (n - 1)) / 2
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  const sumY = werte.reduce((a, b) => a + b, 0)
  const sumXY = werte.reduce((acc, y, i) => acc + i * y, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

function stdAbweichung(werte: number[]): number {
  if (werte.length < 2) return 0
  const avg = werte.reduce((a, b) => a + b, 0) / werte.length
  const variance = werte.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / werte.length
  return Math.sqrt(variance)
}

function klassifiziereTrend(werte: number[], relativeThreshold = 0.05): VitalTrend['trend'] {
  if (werte.length < 3) return 'stabil'
  const avg = werte.reduce((a, b) => a + b, 0) / werte.length
  const slope = steigung(werte)
  const sd = stdAbweichung(werte)
  // High variance relative to mean = schwankend
  if (avg > 0 && sd / avg > 0.15) return 'schwankend'
  const relSlope = avg !== 0 ? Math.abs(slope) / avg : 0
  if (relSlope < relativeThreshold) return 'stabil'
  return slope > 0 ? 'steigend' : 'fallend'
}

export function analysiereTagesbuch(eintraege: EintragInput[]): {
  vitalTrends: VitalTrend[]
  muster: TagesbuchMuster
  warnungen: string[]
  empfehlungen: string[]
} {
  const warnungen: string[] = []
  const empfehlungen: string[] = []

  // ── Vital trends ──────────────────────────────────────────────────────────

  // Blutdruck
  const bpEintraege = eintraege
    .filter(e => e.blutdruck_systolisch != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))

  const bpWerte = bpEintraege.map(e => ({
    datum: e.datum,
    wert: e.blutdruck_systolisch!,
    systolisch: e.blutdruck_systolisch ?? undefined,
    diastolisch: e.blutdruck_diastolisch ?? undefined,
  }))

  let bpAlarm = false
  let bpAlarmGrund: string | undefined
  if (bpWerte.length > 0) {
    const latestSys = bpWerte[bpWerte.length - 1].wert
    if (latestSys >= ALARMGRENZEN.blutdruck_sys_hoch) {
      bpAlarm = true
      bpAlarmGrund = `Systolischer Blutdruck kritisch erhöht: ${latestSys} mmHg`
      warnungen.push(bpAlarmGrund)
    } else if (latestSys <= ALARMGRENZEN.blutdruck_sys_niedrig) {
      bpAlarm = true
      bpAlarmGrund = `Systolischer Blutdruck zu niedrig: ${latestSys} mmHg`
      warnungen.push(bpAlarmGrund)
    }
    // Check for sustained high (>160 on 3+ measurements)
    const highCount = bpWerte.filter(v => v.wert > 160).length
    if (highCount >= 3 && !bpAlarm) {
      warnungen.push(`Wiederholt erhöhter Blutdruck in ${highCount} Messungen (>160 mmHg)`)
      empfehlungen.push('Sprechen Sie mit dem Arzt über den anhaltend erhöhten Blutdruck.')
    }
  }

  const bpTrend: VitalTrend = {
    metrik: 'blutdruck',
    einheit: 'mmHg',
    werte: bpWerte,
    trend: klassifiziereTrend(bpWerte.map(v => v.wert)),
    alarm: bpAlarm,
    alarm_grund: bpAlarmGrund,
  }

  // Puls
  const pulsEintraege = eintraege
    .filter(e => e.puls != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const pulsWerte = pulsEintraege.map(e => ({ datum: e.datum, wert: e.puls! }))
  let pulsAlarm = false
  let pulsAlarmGrund: string | undefined
  if (pulsWerte.length > 0) {
    const latest = pulsWerte[pulsWerte.length - 1].wert
    if (latest > ALARMGRENZEN.puls_hoch) {
      pulsAlarm = true
      pulsAlarmGrund = `Puls erhöht: ${latest} bpm`
      warnungen.push(pulsAlarmGrund)
    } else if (latest < ALARMGRENZEN.puls_niedrig) {
      pulsAlarm = true
      pulsAlarmGrund = `Puls zu niedrig: ${latest} bpm`
      warnungen.push(pulsAlarmGrund)
    }
  }
  const pulsTrend: VitalTrend = {
    metrik: 'puls',
    einheit: 'bpm',
    werte: pulsWerte,
    trend: klassifiziereTrend(pulsWerte.map(v => v.wert)),
    alarm: pulsAlarm,
    alarm_grund: pulsAlarmGrund,
  }

  // Temperatur
  const tempEintraege = eintraege
    .filter(e => e.temperatur != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const tempWerte = tempEintraege.map(e => ({ datum: e.datum, wert: e.temperatur! }))
  let tempAlarm = false
  let tempAlarmGrund: string | undefined
  if (tempWerte.length > 0) {
    const latest = tempWerte[tempWerte.length - 1].wert
    if (latest >= ALARMGRENZEN.temperatur_fieber) {
      tempAlarm = true
      tempAlarmGrund = `Fieber: ${latest}°C`
      warnungen.push(tempAlarmGrund)
      empfehlungen.push('Bei anhaltend erhöhter Temperatur bitte ärztlichen Rat einholen.')
    }
  }
  const tempTrend: VitalTrend = {
    metrik: 'temperatur',
    einheit: '°C',
    werte: tempWerte,
    trend: klassifiziereTrend(tempWerte.map(v => v.wert), 0.01),
    alarm: tempAlarm,
    alarm_grund: tempAlarmGrund,
  }

  // Blutzucker
  const bzEintraege = eintraege
    .filter(e => e.blutzucker != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const bzWerte = bzEintraege.map(e => ({ datum: e.datum, wert: e.blutzucker! }))
  let bzAlarm = false
  let bzAlarmGrund: string | undefined
  if (bzWerte.length > 0) {
    const latest = bzWerte[bzWerte.length - 1].wert
    if (latest > ALARMGRENZEN.blutzucker_hoch) {
      bzAlarm = true
      bzAlarmGrund = `Blutzucker sehr hoch: ${latest} mg/dL`
      warnungen.push(bzAlarmGrund)
      empfehlungen.push('Bitte sprechen Sie dringend mit dem behandelnden Arzt über den erhöhten Blutzucker.')
    } else if (latest < ALARMGRENZEN.blutzucker_niedrig) {
      bzAlarm = true
      bzAlarmGrund = `Blutzucker zu niedrig (Hypoglykämie-Risiko): ${latest} mg/dL`
      warnungen.push(bzAlarmGrund)
      empfehlungen.push('Bei niedrigem Blutzucker sofort einen kohlenhydrathaltigen Snack anbieten und Arzt informieren.')
    }
  }
  const bzTrend: VitalTrend = {
    metrik: 'blutzucker',
    einheit: 'mg/dL',
    werte: bzWerte,
    trend: klassifiziereTrend(bzWerte.map(v => v.wert)),
    alarm: bzAlarm,
    alarm_grund: bzAlarmGrund,
  }

  // Gewicht
  const gewEintraege = eintraege
    .filter(e => e.gewicht != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const gewWerte = gewEintraege.map(e => ({ datum: e.datum, wert: e.gewicht! }))
  let gewAlarm = false
  let gewAlarmGrund: string | undefined
  if (gewWerte.length >= 3) {
    const first = gewWerte[0].wert
    const last = gewWerte[gewWerte.length - 1].wert
    const diff = last - first
    const pct = Math.abs(diff) / first
    if (pct > 0.05 && diff < 0) {
      gewAlarm = true
      gewAlarmGrund = `Gewichtsverlust von ${Math.abs(diff).toFixed(1)} kg im Beobachtungszeitraum`
      warnungen.push(gewAlarmGrund)
      empfehlungen.push('Ungewollter Gewichtsverlust sollte ärztlich abgeklärt werden.')
    }
  }
  const gewTrend: VitalTrend = {
    metrik: 'gewicht',
    einheit: 'kg',
    werte: gewWerte,
    trend: klassifiziereTrend(gewWerte.map(v => v.wert), 0.02),
    alarm: gewAlarm,
    alarm_grund: gewAlarmGrund,
  }

  // Sauerstoff
  const o2Eintraege = eintraege
    .filter(e => e.sauerstoffsaettigung != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const o2Werte = o2Eintraege.map(e => ({ datum: e.datum, wert: e.sauerstoffsaettigung! }))
  let o2Alarm = false
  let o2AlarmGrund: string | undefined
  if (o2Werte.length > 0) {
    const latest = o2Werte[o2Werte.length - 1].wert
    if (latest < ALARMGRENZEN.sauerstoff_niedrig) {
      o2Alarm = true
      o2AlarmGrund = `Sauerstoffsättigung zu niedrig: ${latest}%`
      warnungen.push(o2AlarmGrund)
      empfehlungen.push('Niedrige Sauerstoffsättigung erfordert sofortige ärztliche Bewertung.')
    }
  }
  const o2Trend: VitalTrend = {
    metrik: 'sauerstoff',
    einheit: '%',
    werte: o2Werte,
    trend: klassifiziereTrend(o2Werte.map(v => v.wert), 0.01),
    alarm: o2Alarm,
    alarm_grund: o2AlarmGrund,
  }

  const vitalTrends = [bpTrend, pulsTrend, tempTrend, bzTrend, gewTrend, o2Trend].filter(
    t => t.werte.length > 0
  )

  // ── Muster ────────────────────────────────────────────────────────────────

  // Schmerz trend
  const schmerzWerte = eintraege
    .filter(e => e.schmerz_skala != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map(e => e.schmerz_skala!)

  let schmerzTrend: TagesbuchMuster['schmerz_trend'] = 'nicht_erfasst'
  if (schmerzWerte.length >= 3) {
    const slope = steigung(schmerzWerte)
    if (Math.abs(slope) < 0.3) schmerzTrend = 'stabil'
    else if (slope > 0) {
      schmerzTrend = 'schlechter'
      warnungen.push('Schmerzen nehmen im Beobachtungszeitraum zu.')
      empfehlungen.push('Sprechen Sie mit dem Arzt oder Pflegedienst über die zunehmenden Schmerzen.')
    } else {
      schmerzTrend = 'besser'
    }
  } else if (schmerzWerte.length > 0) {
    const avg = schmerzWerte.reduce((a, b) => a + b, 0) / schmerzWerte.length
    schmerzTrend = avg <= 3 ? 'stabil' : 'stabil'
  }

  // Stimmung
  const stimmungWerte = eintraege
    .filter(e => e.stimmung_skala != null)
    .map(e => e.stimmung_skala!)
  const stimmungsDurchschnitt = stimmungWerte.length > 0
    ? Math.round((stimmungWerte.reduce((a, b) => a + b, 0) / stimmungWerte.length) * 10) / 10
    : null

  if (stimmungsDurchschnitt !== null && stimmungsDurchschnitt < 2.5) {
    warnungen.push(`Durchschnittliche Stimmung niedrig: ${stimmungsDurchschnitt.toFixed(1)}/5`)
    empfehlungen.push('Auf emotionale Unterstützung und soziale Kontakte achten. Ggf. psychosoziale Beratung in Betracht ziehen.')
  }

  // Schlaf
  const schlafWerte = eintraege
    .filter(e => e.schlaf_stunden != null)
    .map(e => e.schlaf_stunden!)
  const schlafDurchschnitt = schlafWerte.length > 0
    ? Math.round((schlafWerte.reduce((a, b) => a + b, 0) / schlafWerte.length) * 10) / 10
    : null

  if (schlafDurchschnitt !== null && schlafDurchschnitt < 5) {
    warnungen.push(`Unzureichender Schlaf: durchschnittlich ${schlafDurchschnitt.toFixed(1)} Stunden`)
    empfehlungen.push('Achten Sie auf eine ruhige Schlafumgebung und regelmäßige Schlafzeiten. Bei anhaltenden Schlafproblemen Arzt einschalten.')
  }

  // Mahlzeit qualität
  const appetitWerte = eintraege.filter(e => e.appetit != null).map(e => e.appetit!)
  let mahlzeitQualitaet: TagesbuchMuster['mahlzeit_qualitaet'] = 'nicht_erfasst'
  if (appetitWerte.length > 0) {
    const schlecht = appetitWerte.filter(a => a === 'schlecht' || a === 'verweigert').length
    const gut = appetitWerte.filter(a => a === 'gut').length
    const ratio = schlecht / appetitWerte.length
    if (ratio > 0.5) {
      mahlzeitQualitaet = 'schlecht'
      warnungen.push(`Häufig schlechter Appetit oder Nahrungsverweigerung (${schlecht} von ${appetitWerte.length} Einträgen)`)
      empfehlungen.push('Regelmäßige Mahlzeiten anbieten, Lieblingsgerichte bevorzugen. Bei anhaltender Nahrungsverweigerung Arzt konsultieren.')
    } else if (gut / appetitWerte.length > 0.6) {
      mahlzeitQualitaet = 'gut'
    } else {
      mahlzeitQualitaet = 'maessig'
    }
  }

  // Flüssigkeit
  const fluessigkeitWerte = eintraege
    .filter(e => e.fluessigkeit_ml != null && e.fluessigkeit_ml > 0)
    .map(e => e.fluessigkeit_ml!)
  const fluessigkeitDurchschnitt = fluessigkeitWerte.length > 0
    ? Math.round(fluessigkeitWerte.reduce((a, b) => a + b, 0) / fluessigkeitWerte.length)
    : null

  if (fluessigkeitDurchschnitt !== null && fluessigkeitDurchschnitt < 1000) {
    warnungen.push(`Zu geringe Flüssigkeitszufuhr: durchschnittlich ${fluessigkeitDurchschnitt} ml/Tag`)
    empfehlungen.push('Achten Sie auf ausreichende Flüssigkeitszufuhr (mindestens 1,5 Liter täglich). Regelmäßig Getränke anbieten.')
  }

  // Aktivität
  const aktivitaetsEintraege = eintraege.filter(e => e.kategorie === 'aktivitaet')
  let aktivitaetsNiveau: TagesbuchMuster['aktivitaets_niveau'] = 'nicht_erfasst'
  if (aktivitaetsEintraege.length > 0) {
    const tage = 30
    const ratio = aktivitaetsEintraege.length / tage
    if (ratio > 0.5) aktivitaetsNiveau = 'aktiv'
    else if (ratio > 0.2) aktivitaetsNiveau = 'eingeschraenkt'
    else aktivitaetsNiveau = 'bettlaegerig'
  }

  // Sturz-Einträge prüfen
  const sturzEintraege = eintraege.filter(e => e.kategorie === 'sturzgeschehen')
  if (sturzEintraege.length > 0) {
    warnungen.push(`${sturzEintraege.length} Sturzereignis(se) im Beobachtungszeitraum dokumentiert`)
    empfehlungen.push('Sturzprävention überprüfen: Stolperfallen beseitigen, ggf. Haltegriffe installieren, Arzt über Sturzrisiko informieren.')
  }

  // Allgemeine Empfehlungen
  if (empfehlungen.length === 0 && warnungen.length === 0) {
    empfehlungen.push('Alle beobachteten Werte liegen im normalen Bereich. Weiter so!')
  }
  if (schlafDurchschnitt !== null && schlafDurchschnitt >= 7) {
    empfehlungen.push('Gute Schlafqualität — weiter so!')
  }
  if (stimmungsDurchschnitt !== null && stimmungsDurchschnitt >= 4) {
    empfehlungen.push('Die Stimmungslage ist sehr gut. Positive Aktivitäten und soziale Kontakte beibehalten.')
  }

  const muster: TagesbuchMuster = {
    schmerz_trend: schmerzTrend,
    stimmungs_durchschnitt: stimmungsDurchschnitt,
    schlaf_durchschnitt: schlafDurchschnitt,
    mahlzeit_qualitaet: mahlzeitQualitaet,
    fluessigkeit_durchschnitt_ml: fluessigkeitDurchschnitt,
    aktivitaets_niveau: aktivitaetsNiveau,
  }

  return { vitalTrends, muster, warnungen, empfehlungen }
}

// ── MDK Bericht Generator ─────────────────────────────────────────────────────

export function generiereMDKBericht(params: {
  zeitraum_von: string
  zeitraum_bis: string
  eintraege: Array<{ datum: string; kategorie: string; eintrag: string; besonderheit: boolean }>
  nutzer_name: string
  pflegegrad: number
}): string {
  const { zeitraum_von, zeitraum_bis, eintraege, nutzer_name, pflegegrad } = params

  const formatDatum = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${d}.${m}.${y}`
  }

  const kategorieLabel: Record<string, string> = {
    allgemein: 'Allgemein',
    mahlzeit: 'Ernährung',
    medikament: 'Medikation',
    koerperpflege: 'Körperpflege',
    ausscheidung: 'Ausscheidung',
    schlaf: 'Schlaf',
    aktivitaet: 'Aktivität',
    arztbesuch: 'Arztbesuch',
    sturzgeschehen: 'Sturzereignis',
    schmerzen: 'Schmerzen',
    stimmung: 'Stimmung',
    vitalwerte: 'Vitalwerte',
    sonstiges: 'Sonstiges',
  }

  // Stat counts per category
  const kategorieCount: Record<string, number> = {}
  for (const e of eintraege) {
    kategorieCount[e.kategorie] = (kategorieCount[e.kategorie] ?? 0) + 1
  }

  const besonderheiten = eintraege.filter(e => e.besonderheit)
  const sortedEintraege = [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum))

  const today = formatDatum(new Date().toISOString().slice(0, 10))

  let bericht = ''
  bericht += '=' .repeat(60) + '\n'
  bericht += 'PFLEGEDOKUMENTATION / MDK-BERICHT\n'
  bericht += '=' .repeat(60) + '\n\n'

  bericht += `Pflegebedürftige/r: ${nutzer_name}\n`
  bericht += `Pflegegrad:         ${pflegegrad}\n`
  bericht += `Berichtszeitraum:   ${formatDatum(zeitraum_von)} – ${formatDatum(zeitraum_bis)}\n`
  bericht += `Erstellt am:        ${today}\n`
  bericht += `Gesamteinträge:     ${eintraege.length}\n\n`

  bericht += '-'.repeat(60) + '\n'
  bericht += 'PFLEGEPROTOKOLL-STATISTIK\n'
  bericht += '-'.repeat(60) + '\n'
  for (const [kat, count] of Object.entries(kategorieCount).sort()) {
    const label = kategorieLabel[kat] ?? kat
    bericht += `  ${label.padEnd(20)} ${count} Einträge\n`
  }
  bericht += '\n'

  if (besonderheiten.length > 0) {
    bericht += '-'.repeat(60) + '\n'
    bericht += 'BESONDERE VORKOMMNISSE\n'
    bericht += '-'.repeat(60) + '\n'
    for (const e of besonderheiten) {
      bericht += `\n[${formatDatum(e.datum)}] ${kategorieLabel[e.kategorie] ?? e.kategorie}\n`
      bericht += `  ${e.eintrag}\n`
    }
    bericht += '\n'
  }

  bericht += '-'.repeat(60) + '\n'
  bericht += 'VOLLSTÄNDIGE DOKUMENTATION\n'
  bericht += '-'.repeat(60) + '\n'

  let currentDatum = ''
  for (const e of sortedEintraege) {
    if (e.datum !== currentDatum) {
      currentDatum = e.datum
      bericht += `\n--- ${formatDatum(e.datum)} ---\n`
    }
    const flag = e.besonderheit ? ' [BESONDERHEIT]' : ''
    bericht += `  [${kategorieLabel[e.kategorie] ?? e.kategorie}]${flag}\n`
    bericht += `  ${e.eintrag}\n`
  }

  bericht += '\n' + '='.repeat(60) + '\n'
  bericht += 'HINWEIS: Dieses Dokument wurde mit xcare (xcare.de) erstellt.\n'
  bericht += 'Es dient der Pflegedokumentation und ist kein ärztliches Attest.\n'
  bericht += '='.repeat(60) + '\n'

  return bericht
}
