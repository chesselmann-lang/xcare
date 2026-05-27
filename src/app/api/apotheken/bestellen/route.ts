import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const BestellungSchema = z.object({
  apotheke_id: z.string().uuid(),
  medikament_name: z.string().min(2).max(200),
  pzn: z.string().optional(),
  menge: z.number().int().min(1).max(99).default(1),
  einheit: z.string().default('Packung'),
  rezept_pflicht: z.boolean().default(false),
  liefer_adresse: z.string().max(500).optional(),
  notizen: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const body = await req.json()
    const parsed = BestellungSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungueltige Daten', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('medikament_bestellungen')
      .insert({ ...parsed.data, user_id: user.id })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id, message: 'Bestellung erfolgreich aufgegeben' }, { status: 201 })
  } catch (error) {
    logger.error('Medikament Bestellung error', { error })
    return NextResponse.json({ error: 'Bestellung fehlgeschlagen' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const { data, error } = await supabase
      .from('medikament_bestellungen')
      .select('id, medikament_name, pzn, menge, einheit, status, bestellt_am, apotheke_id, apotheken(name, ort)')
      .eq('user_id', user.id)
      .order('bestellt_am', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ bestellungen: data })
  } catch (error) {
    logger.error('Medikament Bestellungen GET error', { error })
    return NextResponse.json({ error: 'Abruf fehlgeschlagen' }, { status: 500 })
  }
}
