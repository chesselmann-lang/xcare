import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { FileText, Download, CreditCard, ExternalLink, Receipt } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rechnungen – xcare",
};

interface StripeInvoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: number;
  period_start: number;
  period_end: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  description: string | null;
  lines: {
    data: Array<{ description: string | null }>;
  };
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatTs(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  paid: { label: "Bezahlt", cls: "bg-green-100 text-green-700" },
  open: { label: "Offen", cls: "bg-yellow-100 text-yellow-700" },
  void: { label: "Storniert", cls: "bg-gray-100 text-gray-500" },
  uncollectible: { label: "Uneinbringlich", cls: "bg-red-100 text-red-600" },
  draft: { label: "Entwurf", cls: "bg-blue-100 text-blue-700" },
};

async function fetchInvoices(customerId: string): Promise<StripeInvoice[]> {
  if (!process.env.STRIPE_SECRET_KEY) return [];

  try {
    const { default: StripeLib } = await import("stripe");
    const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    });

    const result = await stripe.invoices.list({
      customer: customerId,
      limit: 24,
    });

    return result.data as StripeInvoice[];
  } catch {
    return [];
  }
}

export default async function RechnungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, stripe_customer_id, plan")
    .eq("profile_id", profile.id)
    .single();
  if (!anbieter) redirect("/anbieter/dashboard");

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  const hasCustomer = !!anbieter.stripe_customer_id;

  const invoices = hasCustomer && stripeConfigured
    ? await fetchInvoices(anbieter.stripe_customer_id!)
    : [];

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount_paid, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[--foreground]">Rechnungen</h1>
        <p className="text-[--muted-foreground] text-sm mt-1">
          Ihre Abo-Rechnungen und Zahlungsbelege
        </p>
      </div>

      {/* Stub / no Stripe */}
      {!stripeConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Stripe nicht konfiguriert</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Rechnungen stehen nach Konfiguration der Stripe-Integration zur Verfügung.
            </p>
          </div>
        </div>
      )}

      {/* No active subscription */}
      {stripeConfigured && !hasCustomer && (
        <div className="bg-[--card] border border-[--border] rounded-xl p-10 text-center">
          <Receipt className="h-10 w-10 text-[--muted-foreground] mx-auto mb-3" />
          <p className="text-[--foreground] font-medium">Noch keine Rechnungen</p>
          <p className="text-[--muted-foreground] text-sm mt-1 mb-4">
            Rechnungen werden nach Abschluss eines kostenpflichtigen Abonnements angezeigt.
          </p>
          <Link
            href="/anbieter/abo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[--primary] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <CreditCard className="h-4 w-4" />
            Abo auswählen
          </Link>
        </div>
      )}

      {/* Invoice list */}
      {stripeConfigured && hasCustomer && (
        <>
          {/* Summary */}
          {invoices.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <p className="text-xs text-[--muted-foreground] font-medium mb-1">Rechnungen gesamt</p>
                <p className="text-2xl font-bold text-[--foreground]">{invoices.length}</p>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <p className="text-xs text-[--muted-foreground] font-medium mb-1">Bezahlt (gesamt)</p>
                <p className="text-2xl font-bold text-[--foreground]">
                  {formatAmount(totalPaid, invoices[0]?.currency ?? "eur")}
                </p>
              </div>
              <div className="bg-[--card] border border-[--border] rounded-xl p-4">
                <p className="text-xs text-[--muted-foreground] font-medium mb-1">Aktueller Plan</p>
                <p className="text-2xl font-bold text-[--foreground] capitalize">
                  {anbieter.plan ?? "Free"}
                </p>
              </div>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="bg-[--card] border border-[--border] rounded-xl p-10 text-center">
              <Receipt className="h-10 w-10 text-[--muted-foreground] mx-auto mb-3" />
              <p className="text-[--foreground] font-medium">Noch keine Rechnungen vorhanden</p>
              <p className="text-[--muted-foreground] text-sm mt-1">
                Ihre erste Rechnung erscheint nach der nächsten Zahlung hier.
              </p>
            </div>
          ) : (
            <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[--border]">
                <h2 className="font-semibold text-[--foreground] text-sm">Alle Rechnungen</h2>
              </div>
              <div className="divide-y divide-[--border]">
                {invoices.map((inv) => {
                  const st = STATUS_MAP[inv.status ?? ""] ?? {
                    label: inv.status ?? "—",
                    cls: "bg-gray-100 text-gray-600",
                  };
                  const lineDesc = inv.lines?.data?.[0]?.description;
                  const displayDesc = inv.description ?? lineDesc ?? "xcare Abonnement";
                  const amount = inv.status === "paid" ? inv.amount_paid : inv.amount_due;

                  return (
                    <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-[--muted] transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-[--muted] shrink-0">
                          <FileText className="h-4 w-4 text-[--muted-foreground]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[--foreground] truncate">
                            {displayDesc}
                          </p>
                          <p className="text-xs text-[--muted-foreground] mt-0.5">
                            {inv.number ? `${inv.number} · ` : ""}
                            {formatTs(inv.created)}
                            {inv.period_start && inv.period_end && (
                              <span className="ml-1 text-[--muted-foreground]/70">
                                ({formatTs(inv.period_start)} – {formatTs(inv.period_end)})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-sm font-semibold text-[--foreground]">
                          {formatAmount(amount, inv.currency)}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {inv.invoice_pdf && (
                            <a
                              href={inv.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="PDF herunterladen"
                              className="p-1.5 rounded-lg text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted] transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                          {inv.hosted_invoice_url && (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Online-Rechnung öffnen"
                              className="p-1.5 rounded-lg text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted] transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manage subscription link */}
          <div className="mt-4 flex items-center justify-between text-sm text-[--muted-foreground]">
            <p>Zahlungsmethode ändern oder Abo kündigen?</p>
            <Link
              href="/anbieter/abo"
              className="inline-flex items-center gap-1.5 text-[--primary] hover:underline font-medium"
            >
              <CreditCard className="h-4 w-4" />
              Abo verwalten →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
