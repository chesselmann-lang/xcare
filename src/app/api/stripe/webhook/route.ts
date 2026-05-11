import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { inngest } from "@/lib/inngest";

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
        // metadata keys set by /api/stripe/checkout: profile_id, plan_id
        const profileId = session.metadata?.profile_id;
        const planId = (session.metadata?.plan_id ?? "starter") as string;

        if (subscriptionId && profileId) {
          // Look up anbieter + profile for email notification
          const { data: anbieter } = await supabase
            .from("anbieter")
            .select("id, name, profile_id")
            .eq("profile_id", profileId)
            .single();

          if (anbieter) {
            const { error } = await supabase.from("anbieter").update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan: planId,
            }).eq("id", anbieter.id);
            if (error) {
              logger.error("stripe/webhook checkout.session.completed db", { error: error.message });
            } else {
              logger.info("stripe/webhook checkout.session.completed", {
                anbieter_id: anbieter.id, plan: planId, subscription: subscriptionId,
              });
              // Fetch profile email for upgrade notification
              const { data: profile } = await supabase
                .from("profiles")
                .select("email, vorname")
                .eq("id", profileId)
                .single();
              if (profile?.email) {
                await inngest.send({
                  name: "billing/plan.upgraded",
                  data: {
                    anbieter_id: anbieter.id,
                    anbieter_name: anbieter.name ?? "",
                    email: profile.email,
                    vorname: profile.vorname ?? "",
                    plan: planId,
                  },
                });
              }
            }
          } else {
            logger.error("stripe/webhook checkout.session.completed: anbieter not found", { profileId });
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object;
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        const { error } = await supabase.from("anbieter").update({
          stripe_subscription_id: sub.id,
          plan_expires_at: periodEnd,
        }).eq("stripe_customer_id", sub.customer);
        if (error) logger.error("stripe/webhook customer.subscription.created", { error: error.message });
        else logger.info("stripe/webhook customer.subscription.created", { id: sub.id, status: sub.status });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
        const planId = resolvePlanFromPriceId(priceId);
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        // If subscription canceled (at period end), keep plan until period ends
        const newPlan = sub.cancel_at_period_end ? planId : planId;
        const { error } = await supabase.from("anbieter").update({
          plan: newPlan,
          plan_expires_at: periodEnd,
        }).eq("stripe_subscription_id", sub.id);
        if (error) logger.error("stripe/webhook customer.subscription.updated", { error: error.message });
        else logger.info("stripe/webhook customer.subscription.updated", {
          id: sub.id, status: sub.status, plan: planId, cancel_at_period_end: sub.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        // Subscription fully ended — downgrade to free
        const sub = event.data.object;
        const { error } = await supabase.from("anbieter").update({
          plan: "free",
          stripe_subscription_id: null,
          plan_expires_at: null,
        }).eq("stripe_subscription_id", sub.id);
        if (error) logger.error("stripe/webhook customer.subscription.deleted", { error: error.message });
        else logger.info("stripe/webhook customer.subscription.deleted", { id: sub.id });
        break;
      }

      case "invoice.paid": {
        // Renewal: extend plan_expires_at to next period end
        const invoice = event.data.object;
        const subId = invoice.subscription as string | null;
        if (subId) {
          // Fetch subscription period end from Stripe
          const periodEnd = invoice.lines?.data?.[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
            : null;
          const update: Record<string, unknown> = {};
          if (periodEnd) update.plan_expires_at = periodEnd;
          if (Object.keys(update).length > 0) {
            const { error } = await supabase.from("anbieter").update(update).eq("stripe_subscription_id", subId);
            if (error) logger.error("stripe/webhook invoice.paid", { error: error.message });
          }
        }
        logger.info("stripe/webhook invoice.paid", {
          id: invoice.id, amount: invoice.amount_paid, subscription: subId,
        });
        break;
      }

      case "invoice.payment_failed": {
        // Payment failed: downgrade to free after 3+ attempts
        const invoice = event.data.object;
        const subId = invoice.subscription as string | null;
        const attemptCount = (invoice.attempt_count as number) ?? 1;

        if (subId) {
          // Look up anbieter + profile for notification
          const { data: anbieter } = await supabase
            .from("anbieter")
            .select("id, name, profile_id")
            .eq("stripe_subscription_id", subId)
            .single();

          if (anbieter) {
      