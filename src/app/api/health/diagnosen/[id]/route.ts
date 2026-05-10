import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

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
    .from("diagnosen")
    .delete()
    .eq("id", id)
    .eq("profil_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
