// ============================================================
// API: /api/ki-beratung
// GET  — Liste der Beratungen des Nutzers (letzte 20)
// POST — Neue Beratung anlegen
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from "@/lib/logger";

const NeueBeratungSchema = z.object({
  titel: z.string().min(1).max(200).optional(),
  thema: z
    .enum(['pflegegrad', 'ansprueche', 'anbieter', 'kosten', 'rechtliches', 'medizinisch', 'organisation', 'dokumente', 'sonstiges'])
    .optional(),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('ki_beratungen')
    .select('id, titel, thema, status, nachrichten_count, letzte_nachricht_am, erstellt_am')
    .eq('user_id', user.id)
    .order('letzte_nachricht_am', { ascending: false })
    .limit(20)

  if (error) {
    logger.error('[ki-beratung GET]', { error: error })
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })
  }

  return NextResponse.json({ beratungen: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = NeueBeratungSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { titel, thema } = parsed.data

  const { data, error } = await supabase
    .from('ki_beratungen')
    .insert({
      user_id: user.id,
      titel: titel ?? null,
      thema: thema ?? null,
      status: 'aktiv',
    })
    .select('id, titel, thema, status, nachrichten_count, letzte_nachricht_am, erstellt_am')
    .single()

  if (error) {
    logger.error('[ki-beratung POST]', { error: error })
    return NextResponse.json({ error: 'Beratung konnte nicht erstellt werden' }, { status: 500 })
  }

  return NextResponse.json({ beratung: data }, { status: 201 })
}
