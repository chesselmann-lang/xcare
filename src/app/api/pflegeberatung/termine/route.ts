import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ── Validierungsschema ────────────────────────────────────────────────────────

const TerminSchema = z.object({
  stelle_id: z.string().uuid({ message: 'Ungültige Beratungsstellen-ID' }),
  wunschtermin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Datum muss im Format JJJJ-MM-TT angegeben werden',
    }),
  wunschuhrzeit: z
    .string()
    .regex(/^\d{2}:\d{2}$/, {
      message: 'Uhrzeit muss im Format HH:MM angegeben werden',
    })
    .optional(),
  beratungsgrund: z
    .string()
    .min(3, { message: 'Bitte beschreiben Sie kurz den Beratungsgrund' })
    .max(2000)
    .optional(),
  kontaktart: z
    .enum(['telefon', 'video', 'hausbesuch', 'praesenz'])
    .default('praesenz'),
});

const StatusUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Ungültige Termin-ID' }),
  status: z.enum(['angefragt', 'bestaetigt', 'abgesagt', 'erledigt']),
  notizen: z.string().max(2000).optional(),
});

// ── GET: Termine des angemeldeten Nutzers ─────────────────────────────────────

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
      .from('beratung_termine')
      .select(
        'id, stelle_id, wunschtermin, wunschuhrzeit, beratungsgrund, ' +
          'kontaktart, status, notizen, erstellt_am, ' +
          'pflegeberatungsstellen(id, name, traeger, traeger_typ, strasse, hausnummer, plz, ort, telefon)'
      )
      .eq('user_id', user.id)
      .order('wunschtermin', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error('beratung_termine GET error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

// ── POST: Neuen Termin anfragen ───────────────────────────────────────────────

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
    const parsed = TerminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const d = parsed.data;

    // Prüfen, ob Beratungsstelle existiert und aktiv ist
    const { data: stelle, error: stelleErr } = await supabase
      .from('pflegeberatungsstellen')
      .select('id, name')
      .eq('id', d.stelle_id)
      .eq('aktiv', true)
      .single();

    if (stelleErr || !stelle) {
      return NextResponse.json(
        { error: 'Beratungsstelle nicht gefunden oder nicht aktiv' },
        { status: 404 }
      );
    }

    // Wunschtermin darf nicht in der Vergangenheit liegen
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const wunschDatum = new Date(d.wunschtermin + 'T00:00:00');
    if (wunschDatum < heute) {
      return NextResponse.json(
        { error: 'Der Wunschtermin darf nicht in der Vergangenheit liegen' },
        { status: 422 }
      );
    }

    const { data: termin, error: insertErr } = await supabase
      .from('beratung_termine')
      .insert({
        user_id: user.id,
        stelle_id: d.stelle_id,
        wunschtermin: d.wunschtermin,
        wunschuhrzeit: d.wunschuhrzeit ?? null,
        beratungsgrund: d.beratungsgrund ?? null,
        kontaktart: d.kontaktart,
        status: 'angefragt',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json(termin, { status: 201 });
  } catch (err) {
    logger.error('beratung_termine POST error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

// ── PATCH: Status aktualisieren (z.B. Termin absagen) ────────────────────────

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = StatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { id, status, notizen } = parsed.data;

    const updatePayload: Record<string, string> = { status };
    if (notizen !== undefined) updatePayload.notizen = notizen;

    const { data: updated, error } = await supabase
      .from('beratung_termine')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) {
      return NextResponse.json({ error: 'Termin nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    logger.error('beratung_termine PATCH error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
