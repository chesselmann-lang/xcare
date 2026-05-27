import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const ArztSchema = z.object({
  arzt_name: z
    .string()
    .min(2, { message: 'Name muss mindestens 2 Zeichen lang sein' })
    .max(200),
  arzt_fachrichtung: z.string().max(200).optional(),
  praxis_name: z.string().max(300).optional(),
  praxis_telefon: z.string().max(50).optional(),
  praxis_adresse: z.string().max(500).optional(),
  naechster_termin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  letzte_behandlung: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  chronische_diagnosen: z.array(z.string().max(300)).default([]),
  aktuelle_medikamente: z.array(z.string().max(300)).default([]),
  befunde_dokumente: z.array(z.string().url()).default([]),
  notizen: z.string().max(2000).optional().nullable(),
});

const UpdateSchema = ArztSchema.partial().extend({
  id: z.string().uuid({ message: 'Ungültige Arzt-ID' }),
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
    const id = url.searchParams.get('id');

    if (id) {
      const { data, error } = await supabase
        .from('arzt_koordination')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Arzt nicht gefunden' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('arzt_koordination')
      .select('*')
      .eq('user_id', user.id)
      .order('naechster_termin', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error('arzt-koordination GET error', {
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
    const parsed = ArztSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const d = parsed.data;

    const { data: eintrag, error } = await supabase
      .from('arzt_koordination')
      .insert({
        user_id: user.id,
        arzt_name: d.arzt_name,
        arzt_fachrichtung: d.arzt_fachrichtung ?? null,
        praxis_name: d.praxis_name ?? null,
        praxis_telefon: d.praxis_telefon ?? null,
        praxis_adresse: d.praxis_adresse ?? null,
        naechster_termin: d.naechster_termin ?? null,
        letzte_behandlung: d.letzte_behandlung ?? null,
        chronische_diagnosen: d.chronische_diagnosen,
        aktuelle_medikamente: d.aktuelle_medikamente,
        befunde_dokumente: d.befunde_dokumente,
        notizen: d.notizen ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(eintrag, { status: 201 });
  } catch (err) {
    logger.error('arzt-koordination POST error', {
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

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { id, ...felder } = parsed.data;

    const updateData: Record<string, unknown> = {
      aktualisiert_am: new Date().toISOString(),
    };
    if (felder.arzt_name !== undefined) updateData.arzt_name = felder.arzt_name;
    if (felder.arzt_fachrichtung !== undefined) updateData.arzt_fachrichtung = felder.arzt_fachrichtung;
    if (felder.praxis_name !== undefined) updateData.praxis_name = felder.praxis_name;
    if (felder.praxis_telefon !== undefined) updateData.praxis_telefon = felder.praxis_telefon;
    if (felder.praxis_adresse !== undefined) updateData.praxis_adresse = felder.praxis_adresse;
    if (felder.naechster_termin !== undefined) updateData.naechster_termin = felder.naechster_termin;
    if (felder.letzte_behandlung !== undefined) updateData.letzte_behandlung = felder.letzte_behandlung;
    if (felder.chronische_diagnosen !== undefined) updateData.chronische_diagnosen = felder.chronische_diagnosen;
    if (felder.aktuelle_medikamente !== undefined) updateData.aktuelle_medikamente = felder.aktuelle_medikamente;
    if (felder.befunde_dokumente !== undefined) updateData.befunde_dokumente = felder.befunde_dokumente;
    if (felder.notizen !== undefined) updateData.notizen = felder.notizen;

    const { data: updated, error } = await supabase
      .from('arzt_koordination')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) {
      return NextResponse.json({ error: 'Arzt-Eintrag nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    logger.error('arzt-koordination PATCH error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    }

    const { error } = await supabase
      .from('arzt_koordination')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error('arzt-koordination DELETE error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
