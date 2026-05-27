import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdatePVSchema = z.object({
  inhalt: z.record(z.unknown()),
  status: z.enum(['entwurf', 'fertig', 'widerrufen']).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/patientenverfuegung/[id]
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
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
      ),
      pv_versionen (
        id, version_nr, inhalt_snapshot, erstellt_am
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .order('version_nr', { ascending: false, referencedTable: 'pv_versionen' })
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
  }

  return NextResponse.json({ verfuegung: data })
}

// PATCH /api/patientenverfuegung/[id] — update inhalt, auto-create new version
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  // Ownership check
  const { data: existing, error: fetchError } = await supabase
    .from('patientenverfuegungen')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  if (existing.status === 'widerrufen') {
    return NextResponse.json({ error: 'Widerrufene Verfügungen können nicht bearbeitet werden' }, { status: 409 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 })
  }

  const parsed = UpdatePVSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { inhalt, status } = parsed.data

  // Get current max version_nr
  const { data: latestVersion } = await supabase
    .from('pv_versionen')
    .select('version_nr')
    .eq('verfuegung_id', id)
    .order('version_nr', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersionNr = (latestVersion?.version_nr ?? 0) + 1

  // Update the Verfügung
  const updatePayload: Record<string, unknown> = { inhalt }
  if (status) updatePayload.status = status

  const { data: updated, error: updateError } = await supabase
    .from('patientenverfuegungen')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? 'Fehler beim Aktualisieren' }, { status: 500 })
  }

  // Create new version snapshot
  await supabase
    .from('pv_versionen')
    .insert({
      verfuegung_id: id,
      user_id: user.id,
      version_nr: nextVersionNr,
      inhalt_snapshot: inhalt,
    })

  return NextResponse.json({ verfuegung: updated })
}

// DELETE /api/patientenverfuegung/[id] — set status = 'widerrufen'
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('patientenverfuegungen')
    .update({
      status: 'widerrufen',
      widerrufen_am: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
  }

  return NextResponse.json({ verfuegung: data })
}
