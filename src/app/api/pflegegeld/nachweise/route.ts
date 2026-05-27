import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const NachweisSchema = z.object({
  beratungs_datum: z.string(),
  berater_name: z.string().optional(),
  berater_organisation: z.string().optional(),
  beratungsart: z.enum(['ambulant','pflegekasse','pflegedienst','sonstige']).default('ambulant'),
  notizen: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const parsed = NachweisSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from('beratungsnachweise')
    .insert({ ...parsed.data, user_id: user.id }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const { id, ...updates } = await req.json();
  const { data, error } = await supabase.from('beratungsnachweise')
    .update(updates).eq('id', id).eq('user_id', user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
