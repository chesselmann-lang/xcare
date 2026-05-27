import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { JAHRESBUDGET_CENT } from '@/lib/entlastung/berechnung'

// Standard-Einstellungen wenn noch keine gespeichert wurden
const DEFAULT_EINSTELLUNGEN = {
  pflegegrad: null as number | null,
  jahresbudget_cent: JAHRESBUDGET_CENT,
  uebertrag_vorjahr_cent: 0,
  kasse_name: null as string | null,
  kasse_kundennummer: null as string | null,
  erinnerung_aktiv: true,
}

// ─── GET: Einstellungen laden (oder Defaults zurückgeben) ─────────────────────

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: einstellungen, error } = await supabase
      .from('entlastungsbetrag_einstellungen')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      logger.error('GET /api/entlastung/einstellungen – query failed', { error: error.message })
      return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })
    }

    return NextResponse.json({
      einstellungen: einstellungen ?? { ...DEFAULT_EINSTELLUNGEN, user_id: user.id },
    })
  } catch (error) {
    logger.error('GET /api/entlastung/einstellungen unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

// ─── POST / PUT: Einstellungen upserten ───────────────────────────────────────

export async function POST(req: NextRequest) {
  return upsertEinstellungen(req)
}

export async function PUT(req: NextRequest) {
  return upsertEinstellungen(req)
}

async function upsertEinstellungen(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await req.json() as {
      pflegegrad?: unknown
      jahresbudget_cent?: unknown
      uebertrag_vorjahr_cent?: unknown
      kasse_name?: unknown
      kasse_kundennummer?: unknown
      erinnerung_aktiv?: unknown
    }

    const {
      pflegegrad,
      jahresbudget_cent,
      uebertrag_vorjahr_cent,
      kasse_name,
      kasse_kundennummer,
      erinnerung_aktiv,
    } = body

    // Validierung
    if (pflegegrad !== undefined && pflegegrad !== null) {
      if (typeof pflegegrad !== 'number' || pflegegrad < 1 || pflegegrad > 5 || !Number.isInteger(pflegegrad)) {
        return NextResponse.json({ error: 'Pflegegrad muss zwischen 1 und 5 liegen' }, { status: 400 })
      }
    }

    if (jahresbudget_cent !== undefined) {
      if (typeof jahresbudget_cent !== 'number' || jahresbudget_cent < 0 || !Number.isInteger(jahresbudget_cent)) {
        return NextResponse.json({ error: 'Jahresbudget muss eine nicht-negative ganze Zahl sein' }, { status: 400 })
      }
    }

    if (uebertrag_vorjahr_cent !== undefined) {
      if (typeof uebertrag_vorjahr_cent !== 'number' || uebertrag_vorjahr_cent < 0 || !Number.isInteger(uebertrag_vorjahr_cent)) {
        return NextResponse.json({ error: 'Übertrag muss eine nicht-negative ganze Zahl sein' }, { status: 400 })
      }
    }

    const upsertData: Record<string, unknown> = {
      user_id: user.id,
    }

    if (pflegegrad !== undefined) upsertData.pflegegrad = pflegegrad ?? null
    if (jahresbudget_cent !== undefined) upsertData.jahresbudget_cent = jahresbudget_cent
    if (uebertrag_vorjahr_cent !== undefined) upsertData.uebertrag_vorjahr_cent = uebertrag_vorjahr_cent
    if (kasse_name !== undefined) {
      upsertData.kasse_name = typeof kasse_name === 'string' && kasse_name.trim() ? kasse_name.trim() : null
    }
    if (kasse_kundennummer !== undefined) {
      upsertData.kasse_kundennummer = typeof kasse_kundennummer === 'string' && kasse_kundennummer.trim()
        ? kasse_kundennummer.trim()
        : null
    }
    if (typeof erinnerung_aktiv === 'boolean') upsertData.erinnerung_aktiv = erinnerung_aktiv

    const { data: einstellungen, error: upsertErr } = await supabase
      .from('entlastungsbetrag_einstellungen')
      .upsert(upsertData, { onConflict: 'user_id' })
      .select()
      .single()

    if (upsertErr) {
      logger.error('POST /api/entlastung/einstellungen – upsert failed', { error: upsertErr.message })
      return NextResponse.json({ error: 'Einstellungen konnten nicht gespeichert werden' }, { status: 500 })
    }

    return NextResponse.json({ einstellungen }, { status: 200 })
  } catch (error) {
    logger.error('POST /api/entlastung/einstellungen unhandled error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
