import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const AngebotSchema = z.object({
  kategorie_id: z.string().uuid(),
  beschreibung: z.string().min(10).max(500),
  zustand: z.enum(['neuwertig','gut','gebraucht']).default('gut'),
  plz: z.string().min(4).max(5),
  ort: z.string().min(2).max(100),
  preis_art: z.enum(['kostenlos','spende','miete']).default('kostenlos'),
  preis_monat_cent: z.number().int().min(0).default(0),
  kontakt_telefon: z.string().optional(),
  kontakt_email: z.string().email().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const plz = searchParams.get('plz');
  const kategorieId = searchParams.get('kategorie_id');
  const typ = searchParams.get('typ') ?? 'angebote';

  const table = typ === 'bedarf' ? 'hilfsmittel_bedarf' : 'hilfsmittel_angebote';
  const statusField = typ === 'bedarf' ? 'offen' : 'aktiv';

  let query = supabase
    .from(table)
    .select('*, hilfsmittel_kategorien(id, name, icon)')
    .eq('status', statusField)
    .order('erstellt_am', { ascending: false })
    .limit(50);

  if (plz) query = query.ilike('plz', `${plz}%`);
  if (kategorieId) query = query.eq('kategorie_id', kategorieId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 }) }
  const parsed = AngebotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from('hilfsmittel_angebote')
    .insert({ ...parsed.data, user_id: user.id })
    .select('*, hilfsmittel_kategorien(id, name, icon)').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
