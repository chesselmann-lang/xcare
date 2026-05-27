// ============================================================
// F31: Pflege-Finanzplaner — API /api/finanzen/steuer
// GET ?jahr=2026&pflegegrad=3&ist_pflegeperson=true
//   → Compute SteuerBerechnung from user's Ausgaben for that year
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { berechneSteuervorteile, type SteuerBerechnung } from '@/lib/finanzen/steuer'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const jahrParam           = searchParams.get('jahr')
    const pflegegradParam     = searchParams.get('pflegegrad')
    const istPflegepersonParam = searchParams.get('ist_pflegeperson')

    const jahr = jahrParam ? parseInt(jahrParam, 10) : new Date().getFullYear()
    if (isNaN(jahr) || jahr < 2020 || jahr > 2030) {
      return NextResponse.json({ error: 'Ungültiges Jahr (2020–2030 erwartet)' }, { status: 400 })
    }

    const pflegegrad = pflegegradParam ? parseInt(pflegegradParam, 10) : 0
    if (isNaN(pflegegrad) || pflegegrad < 0 || pflegegrad > 5) {
      return NextResponse.json({ error: 'Ungültiger Pflegegrad (0–5 erwartet)' }, { status: 400 })
    }

    const ist_pflegeperson = istPflegepersonParam === 'true'

    // Load all Ausgaben for this year
    const { data: ausgaben, error } = await supabase
      .from('pflege_ausgaben')
      .select(
        'kategorie, betrag_cent, erstattung_kasse_cent, erstattung_sonstige_cent'
      )
      .eq('user_id', user.id)
      .gte('datum', `${jahr}-01-01`)
      .lte('datum', `${jahr}-12-31`)

    if (error) {
      logger.error('[GET /api/finanzen/steuer] DB error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const berechnung: SteuerBerechnung = berechneSteuervorteile({
      ausgaben: ausgaben ?? [],
      pflegegrad,
      jahr,
      ist_pflegeperson,
    })

    // Upsert cached summary
    await supabase
      .from('steuer_zusammenfassungen')
      .upsert(
        {
          user_id:                               user.id,
          steuerjahr:                            jahr,
          paragraph_35a_basis_cent:              berechnung.para35a_basis_cent,
          paragraph_35a_steuerminderung_cent:    berechnung.para35a_steuerminderung_cent,
          paragraph_33_ausgaben_cent:            berechnung.para33_aussergew_belastung_cent,
          paragraph_33b_pflegepauschbetrag_cent: berechnung.para33b_pflegepauschbetrag_cent,
          gesamtausgaben_cent:                   berechnung.gesamtausgaben_cent,
          eigenanteil_cent:                      berechnung.eigenanteil_cent,
          erstattungen_gesamt_cent:              berechnung.erstattungen_cent,
          aktualisiert_am:                       new Date().toISOString(),
        },
        { onConflict: 'user_id,steuerjahr' }
      )

    return NextResponse.json({ berechnung })
  } catch (err) {
    logger.error('[GET /api/finanzen/steuer] Unexpected error', { error: String(err) })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
