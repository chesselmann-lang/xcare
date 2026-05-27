import { NextRequest, NextResponse } from 'next/server'
import { sucheApotheken } from '@/lib/apotheken/aponet'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const plz = searchParams.get('plz') ?? undefined
    const ort = searchParams.get('ort') ?? undefined
    const notdienst = searchParams.get('notdienst') === 'true'
    const lieferservice = searchParams.get('lieferservice') === 'true'
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined

    if (!plz && !ort) {
      return NextResponse.json({ error: 'PLZ oder Ort erforderlich' }, { status: 400 })
    }

    const apotheken = await sucheApotheken({
      plz,
      ort,
      nurNotdienst: notdienst,
      nurLieferservice: lieferservice,
      userLat: lat,
      userLng: lng,
    })

    return NextResponse.json({ apotheken }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
    })
  } catch (error) {
    logger.error('Apotheken search error', { error })
    return NextResponse.json({ error: 'Suche fehlgeschlagen' }, { status: 500 })
  }
}
