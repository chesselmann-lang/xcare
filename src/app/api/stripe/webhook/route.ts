import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events.
 * STUB: Logs events until Stripe keys are configured.
 *
 * To configure:
 * 1. Install: npm install stripe
 * 2. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env
 * 3. Register webhook endpoint in Stripe Dashboard:
 *    https://dashboard.stripe.com/webhooks
 *    URL: https://your-domain.de/api/stripe/webhook
 *    Events: checkout.session.completed, customer.subscription.updated,
 *            customer.subscription.deleted, invoice.paid, invoice.payment_failed
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // --- STUB mode: no Stripe keys ---
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.log("[stripe/webhook] STUB mode – received webhook, ignoring (no keys configured)");
    return NextResponse.json({ received: true, mode: "stub" });
  }

  // --- LIVE mode ---
  try {
    const { default: Stripe } = await import("stripe" as never) as never as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: new (...args: any[]) => any;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig ?? "",
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("[stripe/webhook] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Import Supabase admin client for server-side DB writes
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = await createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const profileId = session.client_reference_id ?? session.metadata?.profileId;
        const planId = session.metadata?.planId;

        if (profileId && planId) {
          // Update the anbieter's plan in DB
          const { data: anbieter } = await supabase
            .from("anbieter")
            .select("id")
            .eq("profile_id", profileId)
            .single();

          if (anbieter) {
            await supabase
              .from("anbieter")
              .update({
                plan: planId,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
              })
              .eq("id", anbieter.id);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        if (sub.metadata?.planId) {
          await supabase
            .from("anbieter")
            .update({ plan: sub.metadata.planId })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase
          .from("anbieter")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.paid":
        // Could store last_invoice_date, send receipt email via Inngest, etc.
        console.log("[stripe/webhook] invoice.paid for subscription:", event.data.object.subscription);
        break;

      case "invoice.payment_failed":
        // Could email Anbieter about failed payment, set a warning flag, etc.
        console.warn("[stripe/webhook] invoice.payment_failed:", event.data.object.subscription);
        break;

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

// Disable body parsing – Stripe needs the raw body for signature verification
export const config = {
  api: { bodyParser: false },
};
