import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const fachgebiet = url.searchParams.get('fachgebiet');
    const q = url.searchParams.get('q');

    let query = supabase
      .from('telemedizin_anbieter')
      .select(
        'id, name, slug, beschreibung, fachgebiete, sprachen, verfuegbar_ab, verfuegbar_bis, ' +
        'preis_pro_sitzung_cent, versicherung_direkt, bewertung_schnitt, anzahl_bewertungen, bild_url'
      )
      .eq('verified', true)
      .eq('aktiv', true)
      .order('bewertung_schnitt', { ascending: false });

    if (fachgebiet) {
      query = query.contains('fachgebiete', [fachgebiet]);
    }

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,beschreibung.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    logger.error('telemedizin GET error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
