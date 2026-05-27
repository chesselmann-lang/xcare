import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  berechneZaritScore,
  interpretiereZaritScore,
  ZARIT_FRAGEN,
} from '@/lib/entlastung/zarit'

// Zod schema: exactly 22 questions, each 0–4
const ScreeningSchema = z.object({
  antworten: z
    .record(z.string(), z.number().int().min(0).max(4))
    .refine(
      (val) => {
        const ids = Object.keys(val).map(Number)
        return ZARIT_FRAGEN.every((f) => ids.includes(f.id))
      },
      { message: 'Alle 22 Fragen müssen beantwortet werden.' }
    ),
})

// POST /api/entlastung/screening — save a new Zarit screening result
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const parsed = ScreeningSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { antworten } = parsed.data

    // Compute score server-side — never trust client-supplied scores
    const gesamt_score = berechneZaritScore(antworten)
    const interpretation = interpretiereZaritScore(gesamt_score)

    const { data, error } = await supabase
      .from('burnout_screenings')
      .insert({
        user_id: user.id,
        antworten,
        gesamt_score,
        belastungsstufe: interpretation.stufe,
        empfehlungen: interpretation.empfehlungen,
      })
      .select('id, gesamt_score, belastungsstufe, empfehlungen, erstellt_am')
      .single()

    if (error) {
      logger.error('[POST /api/entlastung/screening]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        screening: data,
        interpretation: {
          bezeichnung: interpretation.bezeichnung,
          beschreibung: interpretation.beschreibung,
          farbe: interpretation.farbe,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    logger.error('[POST /api/entlastung/screening] Unhandled', err)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

// GET /api/entlastung/screening — last 5 screenings for authenticated user
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('burnout_screenings')
      .select('id, gesamt_score, belastungsstufe, empfehlungen, erstellt_am')
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false })
      .limit(5)

    if (error) {
      logger.error('[GET /api/entlastung/screening]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ screenings: data ?? [] })
  } catch (err) {
    logger.error('[GET /api/entlastung/screening] Unhandled', err)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
