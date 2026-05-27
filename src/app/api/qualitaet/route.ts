import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plz = searchParams.get('plz');
  const bundesland = searchParams.get('bundesland');
  const supabase = await createClient();

  let query = supabase
    .from('pflegeheime')
    .select(`
      id, name, traeger, plz, ort, bundesland, telefon, plaetze_gesamt,
      qualitaetsberichte (
        pruefung_datum, score_pflege, score_medizin, score_soziales,
        score_unterkunft, score_gesamt, maengel_anzahl
      )
    `)
    .eq('aktiv', true)
    .order('name');

  if (plz) query = query.ilike('plz', `${plz}%`);
  if (bundesland) query = query.eq('bundesland', bundesland);

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  });
}
