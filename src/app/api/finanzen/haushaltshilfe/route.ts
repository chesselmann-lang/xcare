// ============================================================
// F31: Pflege-Finanzplaner — API /api/finanzen/haushaltshilfe
// GET:    list user's Verträge
// POST:   create new Vertrag
// DELETE: ?id=uuid — own records only
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const VertragCreateSchema = z.object({
  name:                          z.string().min(2).max(200),
  beginn_datum:                  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ende_datum:                    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  monatslohn_cent:               z.number().int().positive(),
  wochenstunden:                 z.number().min(0).max(168).optional().nullable(),
  minijob_angemeldet:            z.boolean().default(false),
  sv_beitraege_arbeitgeber_cent: z.number().int().min(0).default(0),
})

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { data, error } = await supabase
      .from('haushaltshilfe_vertraege')
      .select('*')
      .eq('user_id', user.id)
      .order('beginn_datum', { ascending: false })

    if (error) {
      logger.error('[GET /api/finanzen/haushaltshilfe] DB error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vertraege: data ?? [] })
  } catch (err) {
    logger.error('[GET /api/finanzen/haushaltshilfe] Unexpected', { error: String(err) })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const body = await request.json()
    const parsed = VertragCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const d = parsed.data
    const { data: inserted, error } = await supabase
      .from('haushaltshilfe_vertraege')
      .insert({
        user_id:                       user.id,
        name:                          d.name,
        beginn_datum:                  d.beginn_datum,
        ende_datum:                    d.ende_datum ?? null,
        monatslohn_cent:               d.monatslohn_cent,
        wochenstunden:                 d.wochenstunden ?? null,
        minijob_angemeldet:            d.minijob_angemeldet,
        sv_beitraege_arbeitgeber_cent: d.sv_beitraege_arbeitgeber_cent,
      })
      .select()
      .single()

    if (error) {
      logger.error('[POST /api/finanzen/haushaltshilfe] DB error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vertrag: inserted }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/finanzen/haushaltshilfe] Unexpected', { error: String(err) })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Gültige id erwartet' }, { status: 400 })
    }

    const { error } = await supabase
      .from('haushaltshilfe_vertraege')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('[DELETE /api/finanzen/haushaltshilfe] DB error', { error: error.message, id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[DELETE /api/finanzen/haushaltshilfe] Unexpected', { error: String(err) })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
