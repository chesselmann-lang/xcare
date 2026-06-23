// app/api/ernaehrung/fluessigkeit/route.ts — Flüssigkeitsbilanz
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tage = parseInt(searchParams.get('tage') ?? '7');
  const datum = searchParams.get('datum');

  if (datum) {
    const { data, error } = await supabase
      .from('fluessigkeitsbilanz')
      .select('*')
      .eq('user_id', user.id)
      .eq('bilanz_datum', datum)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('fluessigkeitsbilanz')
    .select('*')
    .eq('user_id', user.id)
    .order('bilanz_datum', { ascending: false })
    .limit(tage);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 }) }
  const { data, error } = await supabase
    .from('fluessigkeitsbilanz')
    .upsert(
      { ...body, user_id: user.id },
      { onConflict: 'user_id,bilanz_datum' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
