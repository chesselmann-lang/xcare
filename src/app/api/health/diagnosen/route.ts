import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const DiagnoseSchema = z.object({
  icd10_code: z.string().max(20).optional().nullable(),
  bezeichnung: z.string().min(1).max(300),
  erstdiagnose: z.string().optional().nullable(),
  arzt: z.string().max(200).optional().nullable(),
  notizen: z.string().max(2000).optional().nullable(),
  chronisch: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, { limit: 60, window: 60 });
  if (!rl.success) return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { data, error } = await supabase
    .from("diagnosen")
    .select("*")
    .eq("profil_id", user.id)
    .order("chronisch", { ascending: false })
    .order("erstdiagnose", { ascending: false });

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

  const parsed = DiagnoseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 422 });

  const { data, error } = await supabase
    .from("diagnosen")
    .insert({ ...parsed.data, profil_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
