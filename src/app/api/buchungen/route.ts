import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, berechneProvision } from "@/lib/stripe/connect";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("buchungen")
      .select(
        "*, anbieter:profiles!anbieter_id(vorname, nachname, avatar_url)"
      )
      .order("datum", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (e) {
    logger.error("GET /api/buchungen failed", { error: String(e) });
    return NextResponse.json({ error: "Fehler beim Laden der Buchungen" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      anbieter_id,
      verfuegbarkeit_id,
      datum,
      zeit_von,
      zeit_bis,
      leistungsart,
      stundensatz,
      notizen,
    } = body;

    // Validate required fields
    if (!anbieter_id || !datum || !zeit_von || !zeit_bis || !leistungsart || !stundensatz) {
      return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
    }

    // Calculate amount in cents
    const von = new Date(`2000-01-01T${zeit_von}`);
    const bis = new Date(`2000-01-01T${zeit_bis}`);
    const stundenMs = bis.getTime() - von.getTime();
    if (stundenMs <= 0) {
      return NextResponse.json({ error: "Ungültiger Zeitraum" }, { status: 400 });
    }
    const stunden = stundenMs / 3_600_000;
    const brutto_ct = Math.round(stunden * Number(stundensatz) * 100);
    const { provision_ct } = berechneProvision(brutto_ct);

    // Create Stripe Payment Intent (with platform fee)
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: brutto_ct,
      currency: "eur",
      application_fee_amount: provision_ct,
      metadata: {
        xcare_type: "buchung",
        familie_user_id: user.id,
        anbieter_id,
        datum,
        leistungsart,
      },
      // Capture manually after Anbieter confirms
      capture_method: "manual",
    });

    // Create booking in DB
    const { data: buchung, error: dbError } = await supabase
      .from("buchungen")
      .insert({
        familie_user_id: user.id,
        anbieter_id,
        verfuegbarkeit_id: verfuegbarkeit_id ?? null,
        datum,
        zeit_von,
        zeit_bis,
        leistungsart,
        stundensatz: Number(stundensatz),
        notizen: notizen ?? null,
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single();

    if (dbError) {
      // Best-effort: cancel the payment intent so the user isn't charged
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => null);
      throw dbError;
    }

    // Reserve the availability slot (fire-and-forget, non-fatal if it fails)
    if (verfuegbarkeit_id) {
      await supabase
        .from("anbieter_verfuegbarkeit")
        .update({ status: "reserviert" })
        .eq("id", verfuegbarkeit_id)
        .catch((err: unknown) =>
          logger.warn("Verfuegbarkeit-Reservierung fehlgeschlagen", {
            verfuegbarkeit_id,
            error: String(err),
          })
        );
    }

    logger.info("Buchung erstellt", {
      buchung_id: buchung.id,
      familie_user_id: user.id,
      anbieter_id,
      brutto_ct,
    });

    return NextResponse.json(
      {
        buchung,
        clientSecret: paymentIntent.client_secret,
      },
      { status: 201 }
    );
  } catch (e) {
    logger.error("POST /api/buchungen failed", { error: String(e) });
    return NextResponse.json({ error: "Buchungsfehler" }, { status: 500 });
  }
}
