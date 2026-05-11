/**
 * Unified Behördenschnittstellen-API
 * GET  /api/behoerden/[adapter]?plz=...&geburtsjahr=...&pflegegrad=...
 * POST /api/behoerden/[adapter]  { body with params }
 *
 * Auth: eingeloggter Nutzer (alle Rollen) oder Träger
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/behoerden/registry";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ adapter: string }> }
) {
  return handler(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ adapter: string }> }
) {
  return handler(req, await params, await req.json().catch(() => ({})));
}

async function handler(
  req: NextRequest,
  { adapter: adapterKey }: { adapter: string },
  body: Record<string, unknown> = {}
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adapter = getAdapter(adapterKey);
  if (!adapter) {
    return NextResponse.json(
      { error: `Unbekannter Adapter: ${adapterKey}`, verfuegbar: Object.keys(require("@/lib/behoerden/registry").BEHOERDEN_ADAPTER) },
      { status: 404 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const params = {
    userPseudoId: user.id.slice(0, 8), // lightweight pseudo for stub
    geburtsjahr: sp.get("geburtsjahr") ? parseInt(sp.get("geburtsjahr")!) : (body.geburtsjahr as number | undefined),
    plz: sp.get("plz") ?? (body.plz as string | undefined),
    extra: {
      pflegegrad: sp.get("pflegegrad") ? parseInt(sp.get("pflegegrad")!) : (body.pflegegrad as number | undefined),
      ...(body.extra as Record<string, unknown> ?? {}),
    },
  };

  try {
    const ergebnis = await adapter.abfragen(params);
    return NextResponse.json(ergebnis, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
