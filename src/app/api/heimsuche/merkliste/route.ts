import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================================
// Zod schemas
// ============================================================

const PostSchema = z.object({
  heim_id: z.string().uuid(),
  notizen: z.string().max(2000).optional(),
})

const PatchSchema = z.object({
  heim_id: z.string().uuid(),
  notizen: z.string().max(2000).optional(),
  kontaktiert_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  besichtigungs_termin: z.string().datetime().optional().nullable(),
  warteliste_angemeldet: z.boolean().optional(),
})

// ============================================================
// GET /api/heimsuche/merkliste — user's saved homes with heim details
// ============================================================

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const { data, error } = await supabase
      .from('heim_merkliste')
      .select(`
        id,
        notizen,
        kontaktiert_am,
        warteliste_angemeldet,
        besichtigungs_termin,
        erstellt_am,
        pflegeheime (
          id, name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland,
          telefon, email, webseite, plaetze_gesamt, plaetze_verfuegbar, wartezeit_monate,
          spezialisierungen, sprachen,
          eigenanteil_pflegekosten_cent, kosten_unterkunft_cent, kosten_verpflegung_cent,
          kosten_investition_cent, eigenanteil_gesamt_cent,
          mdk_note, qualitaet_pflege, qualitaet_alltag, letzte_pruefung,
          einzelzimmer_verfuegbar, haustiere_erlaubt, besuchszeiten, verpflegung_detail, aktivitaeten
        )
      `)
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

// ============================================================
// POST /api/heimsuche/merkliste — add heim to Merkliste
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const body = await req.json()
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { heim_id, notizen } = parsed.data

    const { data, error } = await supabase
      .from('heim_merkliste')
      .upsert(
        { user_id: user.id, heim_id, notizen: notizen ?? null },
        { onConflict: 'user_id,heim_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/heimsuche/merkliste — update notes / dates / status
// ============================================================

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { heim_id, ...updates } = parsed.data

    // Build only the fields that were actually provided
    const updatePayload: Record<string, unknown> = {}
    if ('notizen' in updates) updatePayload.notizen = updates.notizen ?? null
    if ('kontaktiert_am' in updates) updatePayload.kontaktiert_am = updates.kontaktiert_am ?? null
    if ('besichtigungs_termin' in updates) updatePayload.besichtigungs_termin = updates.besichtigungs_termin ?? null
    if ('warteliste_angemeldet' in updates) updatePayload.warteliste_angemeldet = updates.warteliste_angemeldet

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('heim_merkliste')
      .update(updatePayload)
      .eq('user_id', user.id)
      .eq('heim_id', heim_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/heimsuche/merkliste?heim_id=uuid
// ============================================================

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const heim_id = new URL(req.url).searchParams.get('heim_id')
    if (!heim_id) {
      return NextResponse.json({ error: 'heim_id erforderlich' }, { status: 400 })
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(heim_id)) {
      return NextResponse.json({ error: 'Ungültige heim_id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('heim_merkliste')
      .delete()
      .eq('user_id', user.id)
      .eq('heim_id', heim_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
