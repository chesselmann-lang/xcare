import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pg_nummer       = searchParams.get('pg_nummer') ?? undefined
    const erstattungsfaehig = searchParams.get('erstattungsfaehig')
    const erstattung_typ  = searchParams.get('erstattung_typ') ?? undefined
    const q               = searchParams.get('q') ?? undefined
    const pflegegrad_bis  = searchParams.get('pflegegrad_bis')
      ? parseInt(searchParams.get('pflegegrad_bis')!, 10)
      : undefined

    const supabase = await createClient()

    let query = supabase
      .from('pflegehilfsmittel')
      .select('*')
      .eq('aktiv', true)
      .order('pg_nummer')
      .order('name')
      .limit(100)

    if (pg_nummer) {
      query = query.eq('pg_nummer', pg_nummer)
    }

    if (erstattungsfaehig !== null && erstattungsfaehig !== undefined) {
      query = query.eq('erstattungsfaehig', erstattungsfaehig === 'true')
    }

    if (erstattung_typ) {
      query = query.eq('erstattung_typ', erstattung_typ)
    }

    if (pflegegrad_bis !== undefined && !isNaN(pflegegrad_bis)) {
      query = query.lte('pflegegrad_ab', pflegegrad_bis)
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,beschreibung.ilike.%${q}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(
      { produkte: data ?? [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    logger.error('GET /api/pflegehilfsmittel failed', { error })
    return NextResponse.json({ error: 'Fehler beim Laden der Produkte' }, { status: 500 })
  }
}
