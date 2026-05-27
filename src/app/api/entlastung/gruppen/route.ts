import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/entlastung/gruppen
// Query params:
//   typ    — praesenz | online | hybrid
//   thema  — Demenz | Schlaganfall | MS | Parkinson | Allgemeine Pflege | Psychiatrie
//   plz    — filter by PLZ prefix (first 2–5 digits)
//   q      — full-text search in name + beschreibung
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const typ   = searchParams.get('typ')   ?? null
    const thema = searchParams.get('thema') ?? null
    const plz   = searchParams.get('plz')   ?? null
    const q     = searchParams.get('q')     ?? null

    let query = supabase
      .from('selbsthilfegruppen')
      .select('id, name, typ, thema, beschreibung, plz, ort, bundesland, treffen_rhythmus, kontakt_email, kontakt_telefon, webseite, veranstalter')
      .eq('aktiv', true)
      .order('name')

    if (typ) {
      query = query.eq('typ', typ)
    }

    if (thema) {
      query = query.ilike('thema', `%${thema}%`)
    }

    if (plz && plz.length >= 2) {
      // Match groups whose PLZ starts with the supplied prefix
      query = query.ilike('plz', `${plz.substring(0, 5)}%`)
    }

    if (q && q.trim().length > 0) {
      const term = q.trim()
      query = query.or(`name.ilike.%${term}%,beschreibung.ilike.%${term}%,veranstalter.ilike.%${term}%`)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      logger.error('[GET /api/entlastung/gruppen]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { gruppen: data ?? [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    logger.error('[GET /api/entlastung/gruppen] Unhandled', err)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
