// Apotheken-Suche via Open PLZ + Supabase
import { createClient } from '@/lib/supabase/server'

export interface Apotheke {
  id: string
  name: string
  adresse: string
  plz: string
  ort: string
  telefon?: string
  email?: string
  webseite?: string
  lat?: number
  lng?: number
  notdienst_aktiv: boolean
  lieferservice: boolean
  distanz_km?: number
}

export interface PZNLookup {
  pzn: string
  name: string
  hersteller?: string
  einheit?: string
  rezeptpflichtig: boolean
  atc_code?: string
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// PLZ to approximate coordinates (simplified DE PLZ centroids)
const PLZ_COORDS: Record<string, [number, number]> = {
  '10': [52.52, 13.40], // Berlin
  '20': [53.55, 10.00], // Hamburg
  '80': [48.14, 11.58], // Muenchen
  '50': [50.94, 6.96],  // Koeln
  '60': [50.11, 8.68],  // Frankfurt
  '70': [48.78, 9.18],  // Stuttgart
  '40': [51.23, 6.77],  // Duesseldorf
  '44': [51.51, 7.47],  // Dortmund
  '04': [51.34, 12.37], // Leipzig
  '01': [51.05, 13.74], // Dresden
}

export function plzToCoords(plz: string): [number, number] {
  const prefix2 = plz.substring(0, 2)
  return PLZ_COORDS[prefix2] ?? [52.52, 13.40]
}

export async function sucheApotheken(params: {
  plz?: string
  ort?: string
  nurNotdienst?: boolean
  nurLieferservice?: boolean
  userLat?: number
  userLng?: number
  limit?: number
}): Promise<Apotheke[]> {
  const supabase = await createClient()

  let query = supabase
    .from('apotheken')
    .select('id, name, adresse, plz, ort, telefon, email, webseite, lat, lng, notdienst_aktiv, lieferservice')
    .eq('verified', true)

  if (params.plz) {
    // Match first 3 digits for broader search
    query = query.ilike('plz', `${params.plz.substring(0, 3)}%`)
  }
  if (params.ort) {
    query = query.ilike('ort', `%${params.ort}%`)
  }
  if (params.nurNotdienst) {
    query = query.eq('notdienst_aktiv', true)
  }
  if (params.nurLieferservice) {
    query = query.eq('lieferservice', true)
  }

  query = query.limit(params.limit ?? 20)

  const { data, error } = await query
  if (error || !data) return []

  // Add distance if user coords provided
  let results: Apotheke[] = data.map(a => ({
    ...a,
    distanz_km: (params.userLat && params.userLng && a.lat && a.lng)
      ? Math.round(haversineKm(params.userLat, params.userLng, a.lat, a.lng) * 10) / 10
      : undefined
  }))

  // Sort by distance if available
  if (params.userLat) {
    results.sort((a, b) => (a.distanz_km ?? 999) - (b.distanz_km ?? 999))
  }

  return results
}

// PZN lookup via ABDATA/open source - simplified mock with real PZN format
export async function lookupPZN(pzn: string): Promise<PZNLookup | null> {
  // PZN is always 8 digits in Germany
  const cleanPZN = pzn.replace(/\D/g, '').padStart(8, '0')

  // In production: call ABDATA API or mmi PHARMINDEX
  // For demo: return structured mock based on PZN prefix
  const mockDrugs: Record<string, PZNLookup> = {
    '01234567': { pzn: '01234567', name: 'Ibuprofen 400mg', hersteller: 'ratiopharm', einheit: '20 Tabletten', rezeptpflichtig: false, atc_code: 'M01AE01' },
    '02345678': { pzn: '02345678', name: 'Metformin 1000mg', hersteller: 'Hexal', einheit: '120 Tabletten', rezeptpflichtig: true, atc_code: 'A10BA02' },
    '03456789': { pzn: '03456789', name: 'Ramipril 5mg', hersteller: 'ratiopharm', einheit: '100 Tabletten', rezeptpflichtig: true, atc_code: 'C09AA05' },
    '04567890': { pzn: '04567890', name: 'Pantoprazol 40mg', hersteller: 'Stada', einheit: '28 Tabletten', rezeptpflichtig: false, atc_code: 'A02BC02' },
  }

  // Return match or generic entry
  return mockDrugs[cleanPZN] ?? {
    pzn: cleanPZN,
    name: `Medikament PZN ${cleanPZN}`,
    rezeptpflichtig: false,
    einheit: '1 Packung'
  }
}

// Check pharmacy emergency duty (Notdienst) rotation
export async function getNotdienstApotheken(plz: string): Promise<Apotheke[]> {
  return sucheApotheken({ plz, nurNotdienst: true, limit: 5 })
}
