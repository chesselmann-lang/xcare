import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    const plz            = searchParams.get('plz')         // prefix match, 2-3 digits
    const ort            = searchParams.get('ort')
    const pflegegrad     = searchParams.get('pflegegrad')  // 1-5
    const max_eigenanteil = searchParams.get('max_eigenanteil') // EUR (integer)
    const spezialisierung = searchParams.get('spezialisierung')
    const traeger_typ    = searchParams.get('traeger_typ') // freigemeinnuetzig|privat|oeffentlich
    const q              = searchParams.get('q')           // name/traeger full-text
    const sort           = searchParams.get('sort') ?? 'eigenanteil_asc'

    let query = supabase
      .from('pflegeheime')
      .select(
        'id, name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland, ' +
        'lat, lng, telefon, email, webseite, plaetze_gesamt, plaetze_verfuegbar, ' +
        'wartezeit_monate, spezialisierungen, sprachen, ' +
        'eigenanteil_pflegekosten_cent, kosten_unterkunft_cent, kosten_verpflegung_cent, ' +
        'kosten_investition_cent, eigenanteil_gesamt_cent, ' +
        'mdk_note, qualitaet_pflege, qualitaet_alltag, letzte_pruefung, ' +
        'einzelzimmer_verfuegbar, haustiere_erlaubt, besuchszeiten, verpflegung_detail, aktivitaeten'
      )
      .eq('aktiv', true)

    // PLZ prefix match (e.g. "10" matches all 10xxx PLZ)
    if (plz) {
      query = query.like('plz', `${plz}%`)
    }

    // Ort filter (case-insensitive prefix)
    if (ort) {
      query = query.ilike('ort', `${ort}%`)
    }

    // Trägertyp exact match
    if (traeger_typ && ['freigemeinnuetzig', 'privat', 'oeffentlich'].includes(traeger_typ)) {
      query = query.eq('traeger_typ', traeger_typ)
    }

    // Max Eigenanteil in EUR → convert to cents
    if (max_eigenanteil) {
      const maxCent = parseInt(max_eigenanteil, 10) * 100
      if (!isNaN(maxCent)) {
        query = query.lte('eigenanteil_gesamt_cent', maxCent)
      }
    }

    // Spezialisierung: array contains
    if (spezialisierung) {
      query = query.contains('spezialisierungen', [spezialisierung])
    }

    // Name/Träger search
    if (q) {
      const term = q.trim()
      query = query.or(`name.ilike.%${term}%,traeger.ilike.%${term}%`)
    }

    // Sorting
    switch (sort) {
      case 'eigenanteil_desc':
        query = query.order('eigenanteil_gesamt_cent', { ascending: false })
        break
      case 'qualitaet_desc':
        query = query.order('qualitaet_pflege', { ascending: false, nullsFirst: false })
        break
      case 'name_asc':
        query = query.order('name', { ascending: true })
        break
      case 'eigenanteil_asc':
      default:
        query = query.order('eigenanteil_gesamt_cent', { ascending: true })
        break
    }

    query = query.limit(20)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If pflegegrad provided, annotate each heim with the Pflegekassenbeitrag
    // so the client can display personalised Eigenanteil without a round-trip
    let result = data ?? []
    if (pflegegrad) {
      const pg = parseInt(pflegegrad, 10)
      const PFLEGEKASSE: Record<number, number> = {
        1: 0, 2: 77000, 3: 126200, 4: 177500, 5: 200500,
      }
      const kassenleistung = PFLEGEKASSE[pg] ?? 0
      result = result.map((h) => ({
        ...h,
        pflegekasse_leistung_cent: kassenleistung,
        persoenlicher_eigenanteil_cent: Math.max(
          0,
          (h.eigenanteil_gesamt_cent ?? 0) - kassenleistung
        ),
      }))
    }

    return NextResponse.json(
      { data: result },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    )
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
