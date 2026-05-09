import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/app/api/inngest/route";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { familie_email, familie_name, anbieter_name, new_status, lebenslage, anfrage_id } = body;

    await inngest.send({
      name: "anfrage/status-changed",
      data: {
        familie_email,
        familie_name,
        anbieter_name,
        new_status,
        lebenslage,
        anfrage_id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[inngest-status]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
