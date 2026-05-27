import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);

    const plz = url.searchParams.get('plz');
    const ort = url.searchParams.get('ort');
    const bundesland = url.searchParams.get('bundesland');
    const traeger_typ = url.searchParams.get('traeger_typ');
    const hausbesuche = url.searchParams.get('hausbesuche');
    const video_beratung = url.searchParams.get('video_beratung');

    let query = supabase
      .from('pflegeberatungsstellen')
      .select(
        'id, name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland, ' +
        'lat, lng, telefon, email, webseite, oeffnungszeiten, ' +
        'sprachen, hausbesuche, video_beratung, zertifiziert, erstellt_am'
      )
      .eq('aktiv', true)
      .order('ort', { ascending: true });

    if (plz) {
      query = query.ilike('plz', `${plz}%`);
    }

    if (ort) {
      query = query.ilike('ort', `%${ort}%`);
    }

    if (bundesland) {
      query = query.eq('bundesland', bundesland);
    }

    if (traeger_typ) {
      query = query.eq('traeger_typ', traeger_typ);
    }

    if (hausbesuche === 'true') {
      query = query.eq('hausbesuche', true);
    }

    if (video_beratung === 'true') {
      query = query.eq('video_beratung', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    logger.error('pflegeberatung GET error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
