import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";

export async function POST(req: NextRequest) {
  try {
    const { anbieterId } = await req.json();
    if (!isUuid(anbieterId)) {
      return NextResponse.json({ error: "Invalid anbieterId" }, { status: 400 });
    }

    // Clamp referrer so a crafted header can't blow up the DB column
    const rawReferrer = req.headers.get("referer") ?? null;
    const referrer = rawReferrer ? rawReferrer.slice(0, 500) : null;

    const supabase = await createClient();
    await supabase
      .from("anbieter_profil_aufrufe")
      .insert({ anbieter_id: anbieterId, referrer });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
