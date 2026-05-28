// app/api/wundversorgung/protokoll/route.ts — Verbandswechsel
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const wundeId = searchParams.get('wunde_id');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  let query = supabase
    .from('verbandswechsel')
    .select('*')
    .eq('user_id', user.id)
    .order('wechsel_datum', { ascending: false })
    .limit(limit);

  if (wundeId) query = query.eq('wunde_id', wundeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Insert verbandswechsel
  const { data: vw, error: vwErr } = await supabase
    .from('verbandswechsel')
    .insert({ ...body, user_id: user.id })
    .select()
    .single();
  if (vwErr) return NextResponse.json({ error: vwErr.message }, { status: 500 });

  // Update wunde with latest befund + next wechsel date
  const { wunde_id, groesse_cm2, tiefe_mm, exsudat_menge, exsudat_art, wundgrund,
    infektion_zeichen, schmerz_nrs, wechsel_datum } = body;

  if (wunde_id) {
    const { data: wunde } = await supabase.from('wunden').select('wechselintervall_tage').eq('id', wunde_id).single();
    const tage = wunde?.wechselintervall_tage ?? 2;
    const naechster = new Date(wechsel_datum || new Date());
    naechster.setDate(naechster.getDate() + tage);

    await supabase.from('wunden').update({
      groesse_cm2, tiefe_mm, exsudat_menge, exsudat_art, wundgrund,
      infektion_zeichen, schmerz_nrs,
      naechster_wechsel: naechster.toISOString().split('T')[0],
    }).eq('id', wunde_id).eq('user_id', user.id);
  }

  return NextResponse.json(vw);
}
