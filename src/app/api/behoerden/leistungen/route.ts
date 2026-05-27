import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const kategorie  = searchParams.get('kategorie') ?? undefined
    const behoerde   = searchParams.get('behoerde') ?? undefined
    const q          = searchParams.get('q') ?? undefined
    const pflegegrad = searchParams.get('pflegegrad')
      ? parseInt(searchParams.get('pflegegrad')!, 10)
      : undefined

    const supabase = await createClient()

    let query = supabase
      .from('sozialleistungen')
      .select('*')
      .eq('aktiv', true)
      .order('prioritaet', { ascending: true })
      .limit(50)

    if (kategorie) {
      query = query.eq('kategorie', kategorie)
    }

    if (behoerde) {
      query = query.ilike('behoerde', `%${behoerde}%`)
    }

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,beschreibung.ilike.%${q}%,rechtsgrundlage.ilike.%${q}%,kurzname.ilike.%${q}%`
      )
    }

    if (pflegegrad !== undefined && !isNaN(pflegegrad)) {
      // Filter: Anspruchsvoraussetzungen must contain the matching Pflegegrad
      // We filter in-memory after fetching since array contains needs special handling
      const { data, error } = await query
      if (error) throw error

      const filtered = (data ?? []).filter((leistung) => {
        if (!leistung.anspruchsvoraussetzungen) return true
        const voraussetzungen: string[] = leistung.anspruchsvoraussetzungen
        // Check if any prerequisite mentions the pflegegrad or a lower grade range
        const pgStr = String(pflegegrad)
        const requiresPG = voraussetzungen.some((v) =>
          v.toLowerCase().includes('pflegegrad') || v.toLowerCase().includes('pg')
        )
        if (!requiresPG) return true
        // Check if this pflegegrad is within the required range
        return voraussetzungen.some((v) => {
          const lower = v.toLowerCase()
          // "Pflegegrad 1-5" or "Pflegegrad 2+" etc.
          if (lower.includes(`pflegegrad ${pgStr}`) || lower.includes(`pg${pgStr}`) || lower.includes(`pg ${pgStr}`)) return true
          // Range like "2-5" or "1-5"
          const rangeMatch = lower.match(/(\d)-(\d)/)
          if (rangeMatch) {
            const min = parseInt(rangeMatch[1], 10)
            const max = parseInt(rangeMatch[2], 10)
            return pflegegrad >= min && pflegegrad <= max
          }
          // "2+" means 2 or higher
          const plusMatch = lower.match(/(\d)\+/)
          if (plusMatch) {
            return pflegegrad >= parseInt(plusMatch[1], 10)
          }
          return false
        })
      })

      return NextResponse.json(
        { leistungen: filtered },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
          },
        }
      )
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(
      { leistungen: data ?? [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    logger.error('GET /api/behoerden/leistungen failed', { error })
    return NextResponse.json(
      { error: 'Fehler beim Laden der Sozialleistungen' },
      { status: 500 }
    )
  }
}
