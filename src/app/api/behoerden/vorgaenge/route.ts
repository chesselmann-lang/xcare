import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const VorgangCreateSchema = z.object({
  leistung_id:   z.string().uuid().optional(),
  leistung_name: z.string().min(2).max(200),
  behoerde:      z.string().min(2).max(200).optional(),
  notizen:       z.string().max(2000).optional(),
})

const VorgangUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum([
      'geplant',
      'antrag_vorbereiten',
      'eingereicht',
      'nachforderung',
      'bewilligt',
      'abgelehnt',
      'widerspruch',
      'klage',
      'erledigt',
    ])
    .optional(),
  behoerde:              z.string().max(200).optional(),
  eingereicht_am:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  bescheid_erhalten_am:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  widerspruchsfrist_am:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  bescheid_erwartet_am:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  betrag_bewilligt_cent: z.number().int().min(0).optional().nullable(),
  aktenzeichen:          z.string().max(100).optional().nullable(),
  notizen:               z.string().max(2000).optional().nullable(),
  dokumente:             z.array(z.object({
    name:  z.string(),
    datum: z.string().optional(),
    typ:   z.string().optional(),
  })).optional().nullable(),
  erinnerungen: z.array(z.object({
    datum:    z.string(),
    text:     z.string(),
    erledigt: z.boolean().default(false),
  })).optional().nullable(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calculate expected decision date from submission date + processing weeks */
function berechneErwartetesDatum(
  eingereichtAm: string,
  bearbeitungszeit_wochen: number | null
): string | null {
  if (!eingereichtAm || !bearbeitungszeit_wochen) return null
  const d = new Date(eingereichtAm)
  d.setDate(d.getDate() + bearbeitungszeit_wochen * 7)
  return d.toISOString().slice(0, 10)
}

/** Calculate Widerspruchsfrist: 4 weeks after Bescheid */
function berechneWiderspruchsfrist(bescheidErhalten: string): string {
  const d = new Date(bescheidErhalten)
  d.setDate(d.getDate() + 28)
  return d.toISOString().slice(0, 10)
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('behoerden_vorgaenge')
      .select(`
        *,
        leistung:sozialleistungen (
          id, name, kurzname, rechtsgrundlage, behoerde,
          leistungshoehe, bearbeitungszeit_wochen, kategorie, prioritaet
        )
      `)
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false })

    if (error) throw error

    return NextResponse.json({ vorgaenge: data ?? [] })
  } catch (error) {
    logger.error('GET /api/behoerden/vorgaenge failed', { error })
    return NextResponse.json(
      { error: 'Fehler beim Laden der Vorgaenge' },
      { status: 500 }
    )
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = VorgangCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungueltige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const d = parsed.data

    const { data, error } = await supabase
      .from('behoerden_vorgaenge')
      .insert({
        user_id:      user.id,
        leistung_id:  d.leistung_id ?? null,
        leistung_name: d.leistung_name,
        behoerde:     d.behoerde ?? null,
        notizen:      d.notizen ?? null,
        status:       'geplant',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ vorgang: data }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/behoerden/vorgaenge failed', { error })
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Vorgangs' },
      { status: 500 }
    )
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = VorgangUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungueltige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...updates } = parsed.data

    // Auto-calculate derived dates
    const patch: Record<string, unknown> = { ...updates }

    if (updates.eingereicht_am) {
      // We need to look up the Leistung's bearbeitungszeit_wochen
      const { data: vorgang } = await supabase
        .from('behoerden_vorgaenge')
        .select('leistung:sozialleistungen(bearbeitungszeit_wochen)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      const bearbeitungszeit =
        (vorgang?.leistung as { bearbeitungszeit_wochen?: number | null } | null)
          ?.bearbeitungszeit_wochen ?? null

      if (bearbeitungszeit) {
        patch.bescheid_erwartet_am = berechneErwartetesDatum(
          updates.eingereicht_am,
          bearbeitungszeit
        )
      }
    }

    if (updates.bescheid_erhalten_am) {
      patch.widerspruchsfrist_am = berechneWiderspruchsfrist(
        updates.bescheid_erhalten_am
      )
    }

    const { data, error } = await supabase
      .from('behoerden_vorgaenge')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Vorgang nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ vorgang: data })
  } catch (error) {
    logger.error('PATCH /api/behoerden/vorgaenge failed', { error })
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Vorgangs' },
      { status: 500 }
    )
  }
}
