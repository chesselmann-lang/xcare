import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress, optimizeRoute } from "@/lib/routing/openrouteservice";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// POST /api/route-optimizer
// Body: { datum: string (ISO date), klientenAdressen: string[] }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const body = await request.json();
    const { datum, klientenAdressen } = body as {
      datum?: string;
      klientenAdressen?: string[];
    };

    if (!Array.isArray(klientenAdressen) || klientenAdressen.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Adresse erforderlich" },
        { status: 400 }
      );
    }

    if (klientenAdressen.length > 20) {
      return NextResponse.json(
        { error: "Maximal 20 Adressen pro Route" },
        { status: 400 }
      );
    }

    // Get anbieter's PLZ to use as start location
    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("plz, ort, strasse")
      .eq("user_id", user.id)
      .maybeSingle();

    const startAddress = anbieter
      ? [anbieter.strasse, anbieter.plz, anbieter.ort].filter(Boolean).join(", ")
      : null;

    // Geocode start location
    let startLocation = startAddress ? await geocodeAddress(startAddress) : null;

    // Fallback: use Berlin center if no address found
    if (!startLocation) {
      startLocation = { lat: 52.52, lng: 13.405, label: "Berlin Mitte (Fallback)" };
    }

    // Geocode all client addresses in parallel
    const geocoded = await Promise.all(
      klientenAdressen.map(async (addr, idx) => {
        const point = await geocodeAddress(addr);
        if (!point) {
          // Fallback: offset from start by index (rough approximation)
          return {
            lat: startLocation!.lat + idx * 0.01,
            lng: startLocation!.lng + idx * 0.01,
            label: addr,
          };
        }
        return { ...point, label: point.label ?? addr };
      })
    );

    // Optimize route
    const route = await optimizeRoute(geocoded, startLocation);

    logger.info("POST /api/route-optimizer: Route optimiert", {
      user_id: user.id,
      datum,
      stops: klientenAdressen.length,
      totalKm: route.totalDistanceKm,
    });

    return NextResponse.json({
      ok: true,
      datum: datum ?? new Date().toISOString().slice(0, 10),
      startLocation,
      route,
    });
  } catch (err) {
    logger.error("POST /api/route-optimizer error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
