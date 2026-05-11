import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events — both Platform (Abo) and Connect (Zahlungen).
 *
 * Setup:
 * 1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env
 * 2. Register two endpoints in Stripe Dashboard → Webhooks:
 *    a) https://your-domain.de/api/stripe/webhook
 *       Events: checkout.session.completed, customer.subscription.updated,
 *               customer.subscription.deleted, invoice.paid, invoice.payment_failed
 *    b) Same URL, type "Connect" — Events:
 *       account.updated, payment_intent.succeeded, payment_intent.payment_failed,
 *       charge.refunded
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  // Connect-Webhooks haben einen extra Header
  const stripeAccount = req.headers.get("stripe-account"); // acct_... for Connect events

  // --- STUB mode ---
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    logger.info("stripe/webhook STUB mode – no keys configured, ignoring");
    return NextResponse.json({ received: true, mode: "stub" });
  }

  try {
    const { default: Stripe } = await import("stripe");
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
      logger.error("stripe/webhook signature verification failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = await createAdminClient();

    // -----------------------------------------------
    // Connect-Events (stripeAccount gesetzt = Zahlung)
    // -----------------------------------------------
    if (stripeAccount) {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          const snId = pi.metadata?.stundennachweis_id;
          if (snId) {
            await supabase.from("stundennachweise").update({
              status: "paid",
              payment_status: "succeeded",
              stripe_charge_id: pi.latest_charge,
              paid_at: new Date().toISOString(),
            }).eq("id", snId);

            await supabase.from("zahlungen_log").update({
              status: "succeeded",
              stripe_charge_id: pi.latest_charge,
              paid_at: new Date().toISOString(),
            }).eq("payment_intent_id", pi.id);
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          const snId = pi.metadata?.stundennachweis_id;
          if (snId) {
            await supabase.from("stundennachweise").update({
              status: "approved", // zurück auf approved → erneut bezahlbar
              payment_status: "failed",
            }).eq("id", snId);

            await supabase.from("zahlungen_log").update({
              status: "failed",
            }).eq("payment_intent_id", pi.id);
          }
          logger.warn("stripe/webhook payment_intent.payment_failed", { id: pi.id });
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object;
          await supabase.from("zahlungen_log").update({
            status: "refunded",
          }).eq("stripe_charge_id", charge.id);
          logger.info("stripe/webhook charge.refunded", { id: charge.id });
          break;
        }

        case "account.updated": {
          // Connect-Konto hat sich geändert → DB synchronisieren
          const account = event.data.object;
          await supabase.from("stripe_connect_accounts").update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            onboarding_complete: account.details_submitted && account.charges_enabled,
          }).eq("stripe_account_id", account.id);
          logger.info("stripe/webhook account.updated", {
            id: account.id,
            charges: account.charges_enabled,
          });
          break;
        }

        default:
          logger.debug("stripe/webhook Connect unhandled", { type: event.type });
      }
      return NextResponse.json({ received: true });
    }

    // -----------------------------------------------
    // Platform-Events (Abo-Billing)
    // -----------------------------------------------
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const profileId = session.client_reference_id ?? session.metadata?.profileId;
        const planId = session.metadata?.planId;

        if (profileId && planId) {
          const { data: anbieter } = await supabase
            .from("anbieter").select("id").eq("profile_id", profileId).single();
          if (anbieter) {
            await supabase.from("anbieter").update({
              plan: planId,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            }).eq("id", anbieter.id);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        if (sub.metadata?.planId) {
          await supabase.from("anbieter")
            .update({ plan: sub.metadata.planId })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase.from("anbieter")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.paid":
        logger.info("stripe/webhook invoice.paid", { sub: event.data.object.subscription });
        break;

      case "invoice.payment_failed":
        logger.warn("stripe/webhook invoice.payment_failed", { sub: event.data.object.subscription });
        break;

      default:
        logger.debug("stripe/webhook platform unhandled", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("stripe/webhook error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
