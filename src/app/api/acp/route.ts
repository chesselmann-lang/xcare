import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const [pv, vv, dokumente] = await Promise.all([
    supabase.from('patientenverfuegung').select('*').eq('user_id', user.id).single(),
    supabase.from('vorsorgevollmacht').select('*').eq('user_id', user.id).single(),
    supabase.from('acp_dokumente').select('*').eq('user_id', user.id).order('erstellt_am', { ascending: false }),
  ]);

  return NextResponse.json({
    patientenverfuegung: pv.data,
    vorsorgevollmacht: vv.data,
    dokumente: dokumente.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 }) }
  const { typ, daten } = body;

  if (typ === 'patientenverfuegung') {
    const { data, error } = await supabase.from('patientenverfuegung')
      .upsert({ ...daten, user_id: user.id }, { onConflict: 'user_id' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (typ === 'vorsorgevollmacht') {
    const { data, error } = await supabase.from('vorsorgevollmacht')
      .upsert({ ...daten, user_id: user.id }, { onConflict: 'user_id' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'Unbekannter Typ' }, { status: 400 });
}
