import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { generiereVideoLink } from '@/lib/telemedizin/termine';

const BuchungSchema = z.object({
  anbieter_id: z.string().uuid({ message: 'Ungültige Anbieter-ID' }),
  termin_datum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Datum muss im Format JJJJ-MM-TT angegeben werden' }),
  termin_uhrzeit: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: 'Uhrzeit muss im Format HH:MM angegeben werden' }),
  dauer_minuten: z
    .number()
    .int()
    .min(10, { message: 'Mindestdauer ist 10 Minuten' })
    .max(120, { message: 'Maximaldauer ist 120 Minuten' })
    .default(30),
  grund: z
    .string()
    .min(3, { message: 'Bitte beschreiben Sie kurz den Grund der Konsultation' })
    .max(1000)
    .optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    let query = supabase
      .from('telemedizin_termine')
      .select(
        'id, anbieter_id, termin_datum, termin_uhrzeit, dauer_minuten, grund, ' +
        'status, video_link, notizen, arztbrief_url, erstellt_am, ' +
        'telemedizin_anbieter(id, name, slug, fachgebiete, bild_url)'
      )
      .eq('user_id', user.id)
      .order('termin_datum', { ascending: false })
      .order('termin_uhrzeit', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error('telemedizin termine GET error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = BuchungSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const d = parsed.data;

    // Verify the provider exists and is active
    const { data: anbieter, error: anbieterErr } = await supabase
      .from('telemedizin_anbieter')
      .select('id, name')
      .eq('id', d.anbieter_id)
      .eq('verified', true)
      .eq('aktiv', true)
      .single();

    if (anbieterErr || !anbieter) {
      return NextResponse.json(
        { error: 'Anbieter nicht gefunden oder nicht verfügbar' },
        { status: 404 }
      );
    }

    // Check for conflicting appointment at same time
    const { data: konflikt } = await supabase
      .from('telemedizin_termine')
      .select('id')
      .eq('user_id', user.id)
      .eq('termin_datum', d.termin_datum)
      .eq('termin_uhrzeit', d.termin_uhrzeit)
      .not('status', 'eq', 'storniert')
      .maybeSingle();

    if (konflikt) {
      return NextResponse.json(
        { error: 'Sie haben bereits einen Termin zu dieser Zeit. Bitte wählen Sie einen anderen Zeitslot.' },
        { status: 409 }
      );
    }

    // Insert the appointment — generate a temporary ID for the video link
    const tempId = crypto.randomUUID();
    const videoLink = generiereVideoLink(tempId);

    const { data: termin, error: insertErr } = await supabase
      .from('telemedizin_termine')
      .insert({
        user_id: user.id,
        anbieter_id: d.anbieter_id,
        termin_datum: d.termin_datum,
        termin_uhrzeit: d.termin_uhrzeit,
        dauer_minuten: d.dauer_minuten,
        grund: d.grund ?? null,
        status: 'geplant',
        video_link: videoLink,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json(termin, { status: 201 });
  } catch (err) {
    logger.error('telemedizin termine POST error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const url = new URL(req.url);
    const terminId = url.searchParams.get('id');
    if (!terminId) {
      return NextResponse.json({ error: 'Termin-ID fehlt' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body as { status?: string };

    const erlaubteStatus = ['geplant', 'bestaetigt', 'laufend', 'abgeschlossen', 'storniert'];
    if (!status || !erlaubteStatus.includes(status)) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 422 });
    }

    const { data: updated, error } = await supabase
      .from('telemedizin_termine')
      .update({ status })
      .eq('id', terminId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    logger.error('telemedizin termine PATCH error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
