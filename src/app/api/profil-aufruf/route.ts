import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { anbieterId } = await req.json();
    if (!anbieterId || typeof anbieterId !== "string") {
      return NextResponse.json({ error: "Invalid anbieterId" }, { status: 400 });
    }

    const referrer = req.headers.get("referer") ?? null;

    const supabase = await createClient();
    await supabase
      .from("anbieter_profil_aufrufe")
      .insert({ anbieter_id: anbieterId, referrer });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
