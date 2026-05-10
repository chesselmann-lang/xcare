import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const MedikamentSchema = z.object({
  name: z.string().min(1).max(200),
  wirkstoff: z.string().max(200).optional().nullable(),
  staerke: z.string().max(50).optional().nullable(),
  darreichungsform: z.string().max(50).optional().nullable(),
  morgens: z.number().min(0).max(99).default(0),
  mittags: z.number().min(0).max(99).default(0),
  abends: z.number().min(0).max(99).default(0),
  nachts: z.number().min(0).max(99).default(0),
  einheit: z.string().max(50).default("Tablette"),
  hinweis: z.string().max(500).optional().nullable(),
  verordnet_von: z.string().max(200).optional().nullable(),
  seit_datum: z.string().optional().nullable(),
  bis_datum: z.string().optional().nullable(),
  aktiv: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, { limit: 60, window: 60 });
  if (!rl.success) return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { data, error } = await supabase
    .from("medikamente")
    .select("*")
    .eq("profil_id", user.id)
    .order("aktiv", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, { limit: 30, window: 60 });
  if (!rl.success) return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 }); }

  const parsed = MedikamentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 422 });

  const { data, error } = await supabase
    .from("medikamente")
    .insert({ ...parsed.data, profil_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
