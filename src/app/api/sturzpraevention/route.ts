import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [assessments, ereignisse] = await Promise.all([
    supabase.from('sturzpraevention_assessment').select('*').eq('user_id', user.id).order('assessment_datum', { ascending: false }),
    supabase.from('sturzereignis').select('*').eq('user_id', user.id).order('ereignis_datum', { ascending: false }),
  ]);

  return NextResponse.json({ assessments: assessments.data || [], ereignisse: ereignisse.data || [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { typ, ...payload } = body;

  const table = typ === 'ereignis' ? 'sturzereignis' : 'sturzpraevention_assessment';
  const { data, error } = await supabase.from(table).insert({ ...payload, user_id: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
