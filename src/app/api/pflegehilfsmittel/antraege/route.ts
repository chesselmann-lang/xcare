import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const AntragSchema = z.object({
  hilfsmittel_id:       z.string().uuid(),
  pflegegrad:           z.number().int().min(1).max(5),
  krankenkasse:         z.string().min(2),
  ikk_nummer:           z.string().optional(),
  verordnung_vorhanden: z.boolean(),
  arzt_name:            z.string().optional(),
  arzt_lanr:            z.string().optional(),
  notizen:              z.string().optional(),
})

const StatusUpdateSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(['entwurf', 'eingereicht', 'bewilligt', 'abgelehnt', 'widerspruch']),
})

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('hilfsmittel_antraege')
      .select(`
        *,
        hilfsmittel:pflegehilfsmittel (
          id, name, pg_nummer, pg_bezeichnung, erstattung_typ, preis_cent, einheit, hersteller
        )
      `)
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false })

    if (error) throw error

    return NextResponse.json({ antraege: data ?? [] })
  } catch (error) {
    logger.error('GET /api/pflegehilfsmittel/antraege failed', { error })
    return NextResponse.json({ error: 'Fehler beim Laden der Antraege' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = AntragSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungueltige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const d = parsed.data

    const { data, error } = await supabase
      .from('hilfsmittel_antraege')
      .insert({
        user_id:              user.id,
        hilfsmittel_id:       d.hilfsmittel_id,
        pflegegrad:           d.pflegegrad,
        krankenkasse:         d.krankenkasse,
        ikk_nummer:           d.ikk_nummer ?? null,
        verordnung_vorhanden: d.verordnung_vorhanden,
        arzt_name:            d.arzt_name ?? null,
        arzt_lanr:            d.arzt_lanr ?? null,
        notizen:              d.notizen ?? null,
        status:               'entwurf',
        monatliches_budget_cent: 4000,
        aktualisiert_am:      new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ antrag: data }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/pflegehilfsmittel/antraege failed', { error })
    return NextResponse.json({ error: 'Fehler beim Erstellen des Antrags' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = StatusUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungueltige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updateFields: Record<string, unknown> = {
      status:          parsed.data.status,
      aktualisiert_am: new Date().toISOString(),
    }

    if (parsed.data.status === 'eingereicht') {
      updateFields.eingereicht_am = new Date().toISOString()
    } else if (parsed.data.status === 'bewilligt' || parsed.data.status === 'abgelehnt') {
      updateFields.beschieden_am = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('hilfsmittel_antraege')
      .update(updateFields)
      .eq('id', parsed.data.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ antrag: data })
  } catch (error) {
    logger.error('PATCH /api/pflegehilfsmittel/antraege failed', { error })
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Antrags' }, { status: 500 })
  }
}
