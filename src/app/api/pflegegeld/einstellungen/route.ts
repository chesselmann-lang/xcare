import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PFLEGEGELD_BETRAEGE } from '@/lib/pflegegeld/berechnung';
import { z } from 'zod';

const EinstellungenSchema = z.object({
  pflegegrad: z.number().int().min(2).max(5),
  kombinationsleistung: z.boolean().optional(),
  sachleistungsanteil: z.number().int().min(0).max(100).optional(),
  pflegekasse_name: z.string().optional(),
  pflegekasse_nr: z.string().optional(),
  versichertennummer: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const parsed = EinstellungenSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pflegegeld_cent = PFLEGEGELD_BETRAEGE[parsed.data.pflegegrad];
  const { data, error } = await supabase.from('pflegegeld_einstellungen')
    .upsert({ ...parsed.data, pflegegeld_cent, user_id: user.id }, { onConflict: 'user_id' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
