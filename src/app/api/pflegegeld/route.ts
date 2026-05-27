import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const AuszahlungSchema = z.object({
  jahr: z.number().int().min(2020).max(2030),
  monat: z.number().int().min(1).max(12),
  betrag_cent: z.number().int().positive(),
  status: z.enum(['erwartet','erhalten','ausgeblieben','teilweise']).default('erwartet'),
  eingang_datum: z.string().nullable().optional(),
  notiz: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const jahr = parseInt(new URL(req.url).searchParams.get('jahr') ?? String(new Date().getFullYear()));

  const [auszahlungen, einstellungen, nachweise] = await Promise.all([
    supabase.from('pflegegeld_auszahlungen').select('*').eq('user_id', user.id).eq('jahr', jahr).order('monat'),
    supabase.from('pflegegeld_einstellungen').select('*').eq('user_id', user.id).single(),
    supabase.from('beratungsnachweise').select('*').eq('user_id', user.id).order('beratungs_datum', { ascending: false }).limit(10),
  ]);

  return NextResponse.json({
    auszahlungen: auszahlungen.data ?? [],
    einstellungen: einstellungen.data,
    nachweise: nachweise.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const body = await req.json();
  const parsed = AuszahlungSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from('pflegegeld_auszahlungen')
    .upsert({ ...parsed.data, user_id: user.id }, { onConflict: 'user_id,jahr,monat' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const { id, ...updates } = await req.json();
  const { data, error } = await supabase.from('pflegegeld_auszahlungen')
    .update(updates).eq('id', id).eq('user_id', user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
