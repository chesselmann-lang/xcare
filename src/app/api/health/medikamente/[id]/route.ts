import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  wirkstoff: z.string().max(200).optional().nullable(),
  staerke: z.string().max(50).optional().nullable(),
  darreichungsform: z.string().max(50).optional().nullable(),
  morgens: z.number().min(0).max(99).optional(),
  mittags: z.number().min(0).max(99).optional(),
  abends: z.number().min(0).max(99).optional(),
  nachts: z.number().min(0).max(99).optional(),
  einheit: z.string().max(50).optional(),
  hinweis: z.string().max(500).optional().nullable(),
  verordnet_von: z.string().max(200).optional().nullable(),
  seit_datum: z.string().optional().nullable(),
  bis_datum: z.string().optional().nullable(),
  aktiv: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(request, { limit: 30, window: 60 });
  if (!rl.success) return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 422 });

  const { data, error } = await supabase
    .from("medikamente")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profil_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(request, { limit: 30, window: 60 });
  if (!rl.success) return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("medikamente")
    .delete()
    .eq("id", id)
    .eq("profil_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
