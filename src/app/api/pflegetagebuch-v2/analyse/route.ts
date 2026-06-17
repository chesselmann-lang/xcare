import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analysiereTagesbuch } from '@/lib/pflegetagebuch/analyse'
import { logger } from "@/lib/logger";

// Simple in-memory cache: userId -> { result, ts }
const analyseCache = new Map<string, { result: unknown; ts: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// GET /api/pflegetagebuch-v2/analyse
// Runs server-side analysis on last 30 days, caches per user for 1 hour.
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const force = searchParams.get('force') === '1'

    // Check cache
    const cached = analyseCache.get(user.id)
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ ...cached.result, cached: true })
    }

    // Fetch last 30 days entries
    const vonDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const bisDate = new Date().toISOString().slice(0, 10)

    const { data: eintraege, error } = await supabase
      .from('pflegetagebuch_v2')
      .select(`
        datum, kategorie,
        schmerz_skala, stimmung_skala,
        schlaf_stunden, fluessigkeit_ml,
        blutdruck_systolisch, blutdruck_diastolisch,
        puls, temperatur, blutzucker, sauerstoffsaettigung, gewicht,
        appetit
      `)
      .eq('user_id', user.id)
      .gte('datum', vonDate)
      .lte('datum', bisDate)
      .order('datum', { ascending: true })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const analyse = analysiereTagesbuch(eintraege ?? [])

    // Persist to ki_tagebuch_analysen table
    await supabase.from('ki_tagebuch_analysen').insert({
      user_id: user.id,
      analyse_datum: bisDate,
      zeitraum_von: vonDate,
      zeitraum_bis: bisDate,
      muster: analyse.muster,
      warnungen: analyse.warnungen,
      empfehlungen: analyse.empfehlungen,
    })

    // Fetch recent analyses for history
    const { data: historie } = await supabase
      .from('ki_tagebuch_analysen')
      .select('id, analyse_datum, zeitraum_von, zeitraum_bis, warnungen, empfehlungen, erstellt_am')
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false })
      .limit(5)

    const result = {
      zeitraum_von: vonDate,
      zeitraum_bis: bisDate,
      eintraege_count: (eintraege ?? []).length,
      ...analyse,
      historie: historie ?? [],
      cached: false,
    }

    analyseCache.set(user.id, { result, ts: Date.now() })

    return NextResponse.json(result)
  } catch (err) {
    logger.error('[pflegetagebuch-v2/analyse GET]', { error: err })
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
