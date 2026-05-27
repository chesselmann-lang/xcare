// ============================================================
// F31: Pflege-Finanzplaner — API /api/finanzen/ausgaben
// GET: list user's Ausgaben (filters: jahr, kategorie, monat)
// POST: create new Ausgabe
// DELETE: ?id=uuid — own records only
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ── Zod schema ─────────────────────────────────────────────────────────────────

const KATEGORIEN = [
  'ambulante_pflege',
  'stationaere_pflege',
  'hilfsmittel',
  'medikamente',
  'haushaltshilfe',
  'fahrtkosten',
  'umbaumassnahmen',
  'kurzzeitpflege',
  'tagespflege',
  'verhinderungspflege',
  'sonstiges',
] as const

const PARAGRAPHEN = ['§35a', '§33', '§33b'] as const

const AusgabeCreateSchema = z.object({
  datum:                       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format YYYY-MM-DD erwartet'),
  kategorie:                   z.enum(KATEGORIEN),
  bezeichnung:                 z.string().min(1).max(300),
  betrag_cent:                 z.number().int().positive('Betrag muss positiv sein'),
  erstattung_kasse_cent:       z.number().int().min(0).default(0),
  erstattung_sonstige_cent:    z.number().int().min(0).default(0),
  steuerlich_paragraph:        z.enum(PARAGRAPHEN).optional().nullable(),
  belegnummer:                 z.string().max(100).optional().nullable(),
  anbieter:                    z.string().max(200).optional().nullable(),
  notiz:                       z.string().max(2000).optional().nullable(),
  jahressteuererklaerung_jahr: z.number().int().min(2020).max(2030).optional().nullable(),
})

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const jahrParam      = searchParams.get('jahr')
    const kategorieParam = searchParams.get('kategorie')
    const monatParam     = searchParams.get('monat') // "2026-05"

    let query = supabase
      .from('pflege_ausgaben')
      .select('*')
      .eq('user_id', user.id)
      .order('datum', { ascending: false })
      .order('erstellt_am', { ascending: false })

    if (jahrParam) {
      const jahr = parseInt(jahrParam, 10)
      if (isNaN(jahr)) return NextResponse.json({ error: 'Ungültiges Jahr' }, { status: 400 })
      query = query
        .gte('datum', `${jahr}-01-01`)
        .lte('datum', `${jahr}-12-31`)
    }

    if (monatParam) {
      if (!/^\d{4}-\d{2}$/.test(monatParam)) {
        return NextResponse.json({ error: 'Monat im Format YYYY-MM erwartet' }, { status: 400 })
      }
      const [y, m] = monatParam.split('-')
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      query = query
        .gte('datum', `${monatParam}-01`)
        .lte('datum', `${monatParam}-${String(lastDay).padStart(2, '0')}`)
    }

    if (kategorieParam) {
      if (!(KATEGORIEN as ReadonlyArray<string>).includes(kategorieParam)) {
        return NextResponse.json({ error: 'Ungültige Kategorie' }, { status: 400 })
      }
      query = query.eq('kategorie', kategorieParam)
    }

    const { data, error } = await query.limit(500)
    if (error) {
      logger.error('[GET /api/finanzen/ausgaben] DB error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ausgaben: data ?? [] })
  } catch (err) {
    logger.error('[GET /api/finanzen/ausgaben] Unexpected error', { error: String(err) })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const body = await request.json()
    const parsed = AusgabeCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const d = parsed.data

    // Validate: Erstattungen dürfen Betrag nicht übersteigen
    if (d.erstattung_kasse_cent + d.erstattung_sonstige_cent > d.betrag_cent) {
      return NextResponse.json(
        { error: 'Erstattungen überschreiten den Ausgabenbetrag' },
        { status: 400 }
      )
    }

    const { data: inserted, error } = await supabase
      .from('pflege_ausgaben')
      .insert({
        user_id:                     user.id,
        datum:                       d.datum,
        kategorie:                   d.kategorie,
        bezeichnung:                 d.bezeichnung,
        betrag_cent:                 d.betrag_cent,
        erstattung_kasse_cent:       d.erstattung_kasse_cent,
        erstattung_sonstige_cent:    d.erstattung_sonstige_cent,
        steuerlich_paragraph:        d.steuerlich_paragraph ?? null,
        belegnummer:                 d.belegnummer ?? null,
        anbieter:                    d.anbieter ?? null,
        notiz:                       d.notiz ?? null,
        jahressteuererklaerung_jahr: d.jahressteuererklaerung_jahr ?? null,
      })
      .select()
      .single()

    if (error) {
      logger.error('[POST /api/finanzen/ausgaben] DB error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ausgabe: inserted }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/finanzen/ausgaben] Unexpected error', { error: String(err) })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

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

    // RLS ensures user_id = auth.uid(), but explicit check for clarity
    const { error } = await supabase
      .from('pflege_ausgaben')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      logger.error('[DELETE /api/finanzen/ausgaben] DB error', { error: error.message, id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[DELETE /api/finanzen/ausgaben] Unexpected error', { error: String(err) })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
