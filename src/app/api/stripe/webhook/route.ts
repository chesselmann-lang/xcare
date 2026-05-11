import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events — Platform (Subscriptions) + Connect (Payments/Payouts).
 *
 * Webhook Setup in Stripe Dashboard → Developers → Webhooks:
 * 1. Platform endpoint: https://your-domain.de/api/stripe/webhook
 *    Events: checkout.session.completed, customer.subscription.created,
 *            customer.subscription.updated, customer.subscription.deleted,
 *            invoice.paid, invoice.payment_failed, payout.paid, payout.failed
 *
 * 2. Connect endpoint (type "Connect"): same URL
 *    Events: account.updated, payment_intent.succeeded,
 *            payment_intent.payment_failed, charge.refunded,
 *            payout.paid, payout.failed
 *
 * Env vars required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
export const runtime = "nodejs"; // Stripe needs crypto APIs

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  // Connect webhooks include this header (acct_...)
  const stripeAccount = req.headers.get("stripe-account");

  // ── STUB mode (no keys configured) ─────────────────────────────────────────
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    logger.info("stripe/webhook STUB mode – no keys configured");
    return NextResponse.json({ received: true, mode: "stub" });
  }

  // ── Construct & verify event ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;

  try {
    const { default: Stripe } = await import("stripe");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });
    event = stripe.webhooks.constructEvent(body, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error("stripe/webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // CONNECT events  (stripeAccount header → marketplace payments)
    // ──────────────────────────────────────────────────────────────────────────
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
          logger.info("stripe/webhook payment_intent.succeeded", { id: pi.id, account: stripeAccount });
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          const snId = pi.metadata?.stundennachweis_id;
          if (snId) {
            await supabase.from("stundennachweise").update({
              status: "approved",
              payment_status: "failed",
            }).eq("id", snId);
            await supabase.from("zahlungen_log").update({ status: "failed" }).eq("payment_intent_id", pi.id);
          }
          logger.warn("stripe/webhook payment_intent.payment_failed", {
            id: pi.id, reason: pi.last_payment_error?.message,
          });
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object;
          await supabase.from("zahlungen_log").update({ status: "refunded" }).eq("stripe_charge_id", charge.id);
          logger.info("stripe/webhook charge.refunded", { id: charge.id });
          break;
        }

        case "account.updated": {
          const account = event.data.object;
          const { error } = await supabase.from("stripe_connect_accounts").update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            onboarding_complete: account.details_submitted && account.charges_enabled,
            updated_at: new Date().toISOString(),
          }).eq("stripe_account_id", account.id);
          if (error) logger.error("stripe/webhook account.updated", { error: error.message });
          else logger.info("stripe/webhook account.updated", {
            id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
          });
          break;
        }

        case "payout.paid": {
          const payout = event.data.object;
          await supabase.from("zahlungen_log").insert({
            art: "payout",
            status: "paid",
            betrag_eur_cent: payout.amount,
            waehrung: payout.currency.toUpperCase(),
            stripe_account_id: stripeAccount,
            stripe_payout_id: payout.id,
            paid_at: new Date(payout.arrival_date * 1000).toISOString(),
            beschreibung: `Auszahlung ${payout.description ?? ""}`.trim(),
            created_at: new Date().toISOString(),
          });
          logger.info("stripe/webhook payout.paid (connect)", { id: payout.id, amount: payout.amount });
          break;
        }

        case "payout.failed": {
          const payout = event.data.object;
          await supabase.from("zahlungen_log").update({ status: "payout_failed" }).eq("stripe_payout_id", payout.id);
          logger.error("stripe/webhook payout.failed (connect)", {
            id: payout.id, code: payout.failure_code, message: payout.failure_message,
          });
          break;
        }

        default:
          logger.info(`stripe/webhook unhandled connect event: ${event.type}`);
      }
      return NextResponse.json({ received: true });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PLATFORM events  (subscriptions, invoices)
    // ──────────────────────────────────────────────────────────────────────────
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;
        const anbieterProfileId = session.metadata?.anbieter_profil_id;
        const planId = session.metadata?.plan_id ?? "starter";

        if (subscriptionId && anbieterProfileId) {
          const { error } = await supabase.from("anbieter_profile").update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            abo_plan: planId,
            abo_status: "active",
            abo_aktiv_seit: new Date().toISOString(),
          }).eq("id", anbieterProfileId);
          if (error) logger.error("stripe/webhook checkout.session.completed", { error: error.message });
          else logger.info("stripe/webhook checkout.session.completed", {
            anbieter: anbieterProfileId, plan: planId, subscription: subscriptionId,
          });
        }
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object;
        const { error } = await supabase.from("anbieter_profile").update({
          stripe_subscription_id: sub.id,
          abo_status: sub.status,
          abo_periode_start: new Date(sub.current_period_start * 1000).toISOString(),
          abo_periode_ende: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("stripe_customer_id", sub.customer);
        if (error) logger.error("stripe/webhook customer.subscription.created", { error: error.message });
        else logger.info("stripe/webhook customer.subscription.created", { id: sub.id, status: sub.status });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
        const planId = resolvePlanFromPriceId(priceId);
        const { error } = await supabase.from("anbieter_profile").update({
          abo_plan: planId,
          abo_status: sub.status,
          abo_periode_start: new Date(sub.current_period_start * 1000).toISOString(),
          abo_periode_ende: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("stripe_subscription_id", sub.id);
        if (error) logger.error("stripe/webhook customer.subscription.updated", { error: error.message });
        else logger.info("stripe/webhook customer.subscription.updated", {
          id: sub.id, status: sub.status, plan: planId,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const { error } = await supabase.from("anbieter_profile").update({
          abo_plan: "free",
          abo_status: "canceled",
        }).eq("stripe_subscription_id", sub.id);
        if (error) logger.error("stripe/webhook customer.subscription.deleted", { error: error.message });
        else logger.info("stripe/webhook customer.subscription.deleted", { id: sub.id });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription as string | null;
        if (subId) {
          const { error } = await supabase.from("anbieter_profile").update({
            abo_status: "active",
          }).eq("stripe_subscription_id", subId);
          if (error) logger.error("stripe/webhook invoice.paid", { error: error.message });
        }
        logger.info("stripe/webhook invoice.paid", {
          id: invoice.id, amount: invoice.amount_paid, subscription: subId,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription as string | null;
        const attemptCount = (invoice.attempt_count as number) ?? 1;
        if (subId) {
          const newStatus = attemptCount >= 3 ? "past_due" : "payment_failed";
          const { error } = await supabase.from("anbieter_profile").update({
            abo_status: newStatus,
          }).eq("stripe_subscription_id", subId);
          if (error) logger.error("stripe/webhook invoice.payment_failed", { error: error.message });
        }
        logger.warn("stripe/webhook invoice.payment_failed", {
          id: invoice.id, attempt: attemptCount, subscription: subId,
        });
        break;
      }

      case "payout.paid": {
        const payout = event.data.object;
        logger.info("stripe/webhook payout.paid (platform)", { id: payout.id, amount: payout.amount });
        break;
      }

      case "payout.failed": {
        const payout = event.data.object;
        logger.error("stripe/webhook payout.failed (platform)", {
          id: payout.id, code: payout.failure_code, message: payout.failure_message,
        });
        break;
      }

      default:
        logger.info(`stripe/webhook unhandled platform event: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    logger.error("stripe/webhook processing error", {
      event: event?.type,
      error: err instanceof Error ? err.message : String(err),
    });
    // Always 200 to prevent Stripe from retrying handler bugs
    return NextResponse.json({ received: true, error: "handler_error" });
  }
}

/**
 * Map Stripe Price IDs to internal plan names.
 */
function resolvePlanFromPriceId(priceId: string | undefined): string {
  if (!priceId) return "starter";
  const starterMonthly = process.env.STRIPE_PRICE_STARTER_MONTHLY;
  const starterYearly = process.env.STRIPE_PRICE_STARTER_YEARLY;
  const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY;
  if (priceId === starterMonthly || priceId === starterYearly) return "starter";
  if (priceId === proMonthly || priceId === proYearly) return "professional";
  return "starter";
}
