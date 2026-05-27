import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ─── GET: Nutzungen + Einstellungen für ein Jahr ──────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const jahrParam = searchParams.get('jahr')
    const jahr = jahrParam ? parseInt(jahrParam, 10) : new Date().getFullYear()

    if (isNaN(jahr) || jahr < 2020 || jahr > 2030) {
      return NextResponse.json({ error: 'Ungültiges Jahr (2020–2030)' }, { status: 400 })
    }

    const [{ data: nutzungen, error: nutzungErr }, { data: einstellungen, error: einstellungErr }] =
      await Promise.all([
        supabase
          .from('entlastungsbetrag_nutzung')
          .select('*')
          .eq('user_id', user.id)
          .eq('jahr', jahr)
          .order('monat', { ascending: true })
          .order('erstellt_am', { ascending: false }),

        supabase
          .from('entlastungsbetrag_einstellungen')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

    if (nutzungErr) {
      logger.error('GET /api/entlastung – nutzung query failed', { error: nutzungErr.message })
      return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })
    }

    if (einstellungErr) {
      logger.error('GET /api/entlastung – einstellungen query failed', { error: einstellungErr.message })
      return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })
    }

    return NextResponse.json({
      nutzungen: nutzungen ?? [],
      einstellungen: einstellungen ?? null,
      jahr,
    })
  } catch (error) {
    logger.error('GET /api/entlastung unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

// ─── POST: Neuen Eintrag erstellen ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await req.json() as {
      jahr?: unknown
      monat?: unknown
      betrag_cent?: unknown
      leistungsart?: unknown
      anbieter?: unknown
      belegnummer?: unknown
      notiz?: unknown
    }

    const { jahr, monat, betrag_cent, leistungsart, anbieter, belegnummer, notiz } = body

    // Validierung
    if (typeof jahr !== 'number' || jahr < 2020 || jahr > 2030) {
      return NextResponse.json({ error: 'Ungültiges Jahr (2020–2030)' }, { status: 400 })
    }
    if (typeof monat !== 'number' || monat < 1 || monat > 12) {
      return NextResponse.json({ error: 'Ungültiger Monat (1–12)' }, { status: 400 })
    }
    if (typeof betrag_cent !== 'number' || betrag_cent <= 0 || !Number.isInteger(betrag_cent)) {
      return NextResponse.json({ error: 'Betrag muss eine positive ganze Zahl in Cent sein' }, { status: 400 })
    }
    if (typeof leistungsart !== 'string' || !leistungsart.trim()) {
      return NextResponse.json({ error: 'Leistungsart fehlt' }, { status: 400 })
    }

    const ERLAUBTE_LEISTUNGSARTEN = [
      'tagespflege', 'kurzzeit', 'verhinderungspflege', 'hilfsmittel', 'ambulante_pflege', 'sonstiges',
    ]
    if (!ERLAUBTE_LEISTUNGSARTEN.includes(leistungsart)) {
      return NextResponse.json({ error: 'Ungültige Leistungsart' }, { status: 400 })
    }

    const { data: nutzung, error: insertErr } = await supabase
      .from('entlastungsbetrag_nutzung')
      .insert({
        user_id: user.id,
        jahr,
        monat,
        betrag_cent,
        leistungsart,
        anbieter: typeof anbieter === 'string' && anbieter.trim() ? anbieter.trim() : null,
        belegnummer: typeof belegnummer === 'string' && belegnummer.trim() ? belegnummer.trim() : null,
        notiz: typeof notiz === 'string' && notiz.trim() ? notiz.trim() : null,
        erstattung_beantragt: false,
        erstattung_erhalten: false,
      })
      .select()
      .single()

    if (insertErr) {
      logger.error('POST /api/entlastung – insert failed', { error: insertErr.message })
      return NextResponse.json({ error: 'Eintrag konnte nicht gespeichert werden' }, { status: 500 })
    }

    return NextResponse.json({ nutzung }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/entlastung unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

// ─── PATCH: Erstattungsstatus aktualisieren ───────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await req.json() as {
      id?: unknown
      erstattung_beantragt?: unknown
      erstattung_erhalten?: unknown
    }

    const { id, erstattung_beantragt, erstattung_erhalten } = body

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof erstattung_beantragt === 'boolean') {
      updates.erstattung_beantragt = erstattung_beantragt
    }
    if (typeof erstattung_erhalten === 'boolean') {
      updates.erstattung_erhalten = erstattung_erhalten
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 })
    }

    const { data: nutzung, error: updateErr } = await supabase
      .from('entlastungsbetrag_nutzung')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) {
      logger.error('PATCH /api/entlastung – update failed', { error: updateErr.message })
      return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 })
    }

    if (!nutzung) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ nutzung })
  } catch (error) {
    logger.error('PATCH /api/entlastung unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

// ─── DELETE: Eintrag löschen ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })
    }

    const { error: deleteErr } = await supabase
      .from('entlastungsbetrag_nutzung')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteErr) {
      logger.error('DELETE /api/entlastung – delete failed', { error: deleteErr.message })
      return NextResponse.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('DELETE /api/entlastung unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
