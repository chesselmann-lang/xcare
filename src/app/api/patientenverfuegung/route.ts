import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from "@/lib/logger";

const CreatePVSchema = z.object({
  typ: z.enum(['patientenverfuegung', 'vorsorgevollmacht', 'betreuungsverfuegung']),
  inhalt: z.record(z.unknown()),
})

// GET /api/patientenverfuegung — load user's Verfügungen with Bevollmächtigte
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('patientenverfuegungen')
    .select(`
      *,
      pv_bevollmaechtigte (
        id, name, beziehung, telefon, email, adresse, prioritaet, erstellt_am
      )
    `)
    .eq('user_id', user.id)
    .order('erstellt_am', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ verfuegungen: data ?? [] })
}

// POST /api/patientenverfuegung — create new draft + version_1 snapshot
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 })
  }

  const parsed = CreatePVSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { typ, inhalt } = parsed.data

  // Insert the new Verfügung
  const { data: verfuegung, error: insertError } = await supabase
    .from('patientenverfuegungen')
    .insert({
      user_id: user.id,
      typ,
      inhalt,
      status: 'entwurf',
    })
    .select()
    .single()

  if (insertError || !verfuegung) {
    return NextResponse.json({ error: insertError?.message ?? 'Fehler beim Erstellen' }, { status: 500 })
  }

  // Create version 1 snapshot
  const { error: versionError } = await supabase
    .from('pv_versionen')
    .insert({
      verfuegung_id: verfuegung.id,
      user_id: user.id,
      version_nr: 1,
      inhalt_snapshot: inhalt,
    })

  if (versionError) {
    // Non-fatal — log but continue
    logger.error('pv_versionen insert error:', { error: versionError.message })
  }

  return NextResponse.json({ verfuegung }, { status: 201 })
}
