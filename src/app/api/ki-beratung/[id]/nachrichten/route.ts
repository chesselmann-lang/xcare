// ============================================================
// API: /api/ki-beratung/[id]/nachrichten
// GET — Lade Nachrichten einer Beratung (letzte 50)
// Auth: required, user must own the Beratung
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: beratungId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  // Ownership prüfen
  const { data: beratung, error: beratungError } = await supabase
    .from('ki_beratungen')
    .select('id')
    .eq('id', beratungId)
    .eq('user_id', user.id)
    .single()

  if (beratungError || !beratung) {
    return NextResponse.json({ error: 'Beratung nicht gefunden' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('ki_beratung_nachrichten')
    .select('id, rolle, inhalt, tool_aufrufe, dokument_generiert, erstellt_am')
    .eq('beratung_id', beratungId)
    .order('erstellt_am', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[ki-beratung nachrichten GET]', error)
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })
  }

  return NextResponse.json({ nachrichten: data ?? [] })
}
