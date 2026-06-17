import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from "@/lib/logger";

const EintragSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
  uhrzeit: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  kategorie: z.enum([
    'allgemein', 'mahlzeit', 'medikament', 'koerperpflege',
    'ausscheidung', 'schlaf', 'aktivitaet', 'arztbesuch',
    'sturzgeschehen', 'schmerzen', 'stimmung', 'vitalwerte', 'sonstiges',
  ]),
  eintrag: z.string().min(1, 'Eintrag darf nicht leer sein').max(2000),
  schmerz_skala: z.number().int().min(0).max(10).optional(),
  stimmung_skala: z.number().int().min(1).max(5).optional(),
  blutdruck_systolisch: z.number().int().min(50).max(300).optional(),
  blutdruck_diastolisch: z.number().int().min(30).max(200).optional(),
  puls: z.number().int().min(20).max(300).optional(),
  temperatur: z.number().min(30).max(45).optional(),
  blutzucker: z.number().min(10).max(1000).optional(),
  gewicht: z.number().min(10).max(300).optional(),
  sauerstoffsaettigung: z.number().int().min(70).max(100).optional(),
  fluessigkeit_ml: z.number().int().min(0).max(10000).optional(),
  schlaf_stunden: z.number().min(0).max(24).optional(),
  schlaf_qualitaet: z.enum(['gut', 'unruhig', 'unterbrochen', 'sehr_schlecht']).optional(),
  appetit: z.enum(['gut', 'maessig', 'schlecht', 'verweigert']).optional(),
  mahlzeit_beschreibung: z.string().max(500).optional(),
  medikamente_eingenommen: z.array(z.object({
    name: z.string().max(100),
    dosis: z.string().max(50).optional(),
    zeit: z.string().optional(),
    gegeben: z.boolean().default(true),
  })).optional(),
  besonderheit: z.boolean().default(false),
  fuer_mdk_bericht: z.boolean().default(false),
  pflegebeduerftiger_id: z.string().uuid().optional(),
})

// GET /api/pflegetagebuch-v2
// Query params: von, bis, kategorie, limit, besonderheit, vitalwerte
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const von = searchParams.get('von')
    const bis = searchParams.get('bis')
    const kategorie = searchParams.get('kategorie')
    const limitParam = searchParams.get('limit')
    const besonderheitParam = searchParams.get('besonderheit')
    const vitalwerteOnly = searchParams.get('vitalwerte') === '1'

    const limit = Math.min(parseInt(limitParam ?? '50', 10) || 50, 200)

    if (vitalwerteOnly) {
      // Return aggregated vital signs for charting (last 30 days by default)
      const vonDate = von ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const bisDate = bis ?? new Date().toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('pflegetagebuch_v2')
        .select(`
          datum,
          blutdruck_systolisch, blutdruck_diastolisch, puls,
          temperatur, blutzucker, gewicht, sauerstoffsaettigung
        `)
        .eq('user_id', user.id)
        .gte('datum', vonDate)
        .lte('datum', bisDate)
        .not('blutdruck_systolisch', 'is', null)
        .or('blutdruck_systolisch.not.is.null,puls.not.is.null,temperatur.not.is.null,blutzucker.not.is.null,gewicht.not.is.null,sauerstoffsaettigung.not.is.null')
        .order('datum', { ascending: true })
        .limit(200)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ vitalwerte: data ?? [] })
    }

    // Standard diary entry query
    let query = supabase
      .from('pflegetagebuch_v2')
      .select(`
        id, datum, uhrzeit, kategorie, eintrag,
        schmerz_skala, stimmung_skala,
        blutdruck_systolisch, blutdruck_diastolisch, puls,
        temperatur, blutzucker, gewicht, sauerstoffsaettigung,
        fluessigkeit_ml, schlaf_stunden, schlaf_qualitaet,
        appetit, mahlzeit_beschreibung,
        medikamente_eingenommen,
        besonderheit, fuer_mdk_bericht,
        erstellt_am
      `)
      .eq('user_id', user.id)
      .order('datum', { ascending: false })
      .order('erstellt_am', { ascending: false })
      .limit(limit)

    if (von) query = query.gte('datum', von)
    if (bis) query = query.lte('datum', bis)
    if (kategorie && kategorie !== 'alle') query = query.eq('kategorie', kategorie)
    if (besonderheitParam === 'true') query = query.eq('besonderheit', true)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ eintraege: data ?? [] })
  } catch (err) {
    logger.error('[pflegetagebuch-v2 GET]', { error: err })
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

// POST /api/pflegetagebuch-v2
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = EintragSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const { data: inserted, error } = await supabase
      .from('pflegetagebuch_v2')
      .insert({
        user_id: user.id,
        pflegebeduerftiger_id: data.pflegebeduerftiger_id ?? null,
        datum: data.datum,
        uhrzeit: data.uhrzeit ?? null,
        kategorie: data.kategorie,
        eintrag: data.eintrag,
        schmerz_skala: data.schmerz_skala ?? null,
        stimmung_skala: data.stimmung_skala ?? null,
        blutdruck_systolisch: data.blutdruck_systolisch ?? null,
        blutdruck_diastolisch: data.blutdruck_diastolisch ?? null,
        puls: data.puls ?? null,
        temperatur: data.temperatur ?? null,
        blutzucker: data.blutzucker ?? null,
        gewicht: data.gewicht ?? null,
        sauerstoffsaettigung: data.sauerstoffsaettigung ?? null,
        fluessigkeit_ml: data.fluessigkeit_ml ?? null,
        schlaf_stunden: data.schlaf_stunden ?? null,
        schlaf_qualitaet: data.schlaf_qualitaet ?? null,
        appetit: data.appetit ?? null,
        mahlzeit_beschreibung: data.mahlzeit_beschreibung ?? null,
        medikamente_eingenommen: data.medikamente_eingenommen ?? null,
        besonderheit: data.besonderheit,
        fuer_mdk_bericht: data.fuer_mdk_bericht,
      })
      .select('id, datum, kategorie, erstellt_am')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ eintrag: inserted }, { status: 201 })
  } catch (err) {
    logger.error('[pflegetagebuch-v2 POST]', { error: err })
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

// PATCH /api/pflegetagebuch-v2?id=... — toggle besonderheit / fuer_mdk_bericht
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 })

    const body = await req.json()
    const UpdateSchema = z.object({
      besonderheit: z.boolean().optional(),
      fuer_mdk_bericht: z.boolean().optional(),
    })
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Felder' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pflegetagebuch_v2')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, besonderheit, fuer_mdk_bericht')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ eintrag: data })
  } catch (err) {
    logger.error('[pflegetagebuch-v2 PATCH]', { error: err })
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
