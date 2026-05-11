import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, formatPrice, type PlanId } from "@/lib/stripe/plans";
import { CheckCircle2, XCircle, Zap, Building2, Users, ArrowRight, CreditCard } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";
import { ManageSubscriptionButton } from "./manage-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mein Abo – xcare",
};

export default async function AboPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success, canceled } = await searchParams;
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
    .select("id, name, plan, verifiziert, stripe_customer_id, stripe_subscription_id, plan_expires_at")
    .eq("profile_id", profile.id)
    .single();
  if (!anbieter) redirect("/anbieter/dashboard");

  const currentPlanId: PlanId = (anbieter.plan as PlanId) ?? "free";
  const hasActiveSubscription = !!anbieter.stripe_customer_id && currentPlanId !== "free";

  // Count current leistungen and team members for usage display
  const [{ count: leistungenCount }, { count: teamCount }] = await Promise.all([
    supabase.from("leistungen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter.id).eq("aktiv", true),
    supabase.from("anbieter_team").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter.id),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Success / Canceled banners */}
      {success && (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Abo erfolgreich aktiviert!</p>
            <p className="text-xs mt-0.5">Ihr Upgrade wurde verarbeitet. Viel Erfolg mit xcare Professional.</p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">Der Bezahlvorgang wurde abgebrochen. Kein Betrag wurde belastet.</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Mein Abo</h1>
          <p className="text-[--muted-foreground] text-sm mt-1">
            Wählen Sie den passenden Plan für {anbieter.name}
          </p>
        </div>
        {hasActiveSubscription && <ManageSubscriptionButton />}
      </div>

      {/* Active subscription info card */}
      {hasActiveSubscription && (
        <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
          <CreditCard className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Aktives Abonnement</p>
            <p className="text-xs mt-0.5">
              Sie sind im <span className="font-medium capitalize">{currentPlanId}</span>-Plan.
              {anbieter.plan_expires_at && (
                <> Nächste Verlängerung:{" "}
                  <span className="font-medium">
                    {new Date(anbieter.plan_expires_at).toLocaleDateString("de-DE", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </span>
                </>
              )}
              {" "}Zahlungsmethode ändern, Rechnungen herunterladen oder kündigen Sie über das Abo-Portal.
            </p>
          </div>
        </div>
      )}

      {/* Current usage */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[--card] border border-[--border] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[--muted-foreground] text-xs font-medium mb-2">
            <Building2 className="h-3.5 w-3.5" />
            Aktive Leistungen
          </div>
          <p className="text-2xl font-bold text-[--foreground]">{leistungenCount ?? 0}</p>
        </div>
        <div className="bg-[--card] border border-[--border] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[--muted-foreground] text-xs font-medium mb-2">
            <Users className="h-3.5 w-3.5" />
            Team-Mitglieder
          </div>
          <p className="text-2xl font-bold text-[--foreground]">{teamCount ?? 0}</p>
        </div>
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-[--muted-foreground] text-xs font-medium mb-2">
            <Zap className="h-3.5 w-3.5" />
            Aktueller Plan
          </div>
          <p className="text-2xl font-bold text-[--foreground] capitalize">{currentPlanId}</p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isEnterprise = plan.id === "enterprise";

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col bg-[--card] border rounded-2xl p-5 ${
                plan.highlight
                  ? "border-[--primary] shadow-md shadow-[--primary]/10 ring-1 ring-[--primary]"
                  : "border-[--border]"
              } ${isCurrent ? "opacity-90" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[--primary] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Empfohlen
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-base font-bold text-[--foreground]">{plan.name}</h2>
                <p className="text-xs text-[--muted-foreground] mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-5">
                {isEnterprise ? (
                  <p className="text-2xl font-bold text-[--foreground]">Individuell</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-[--foreground]">
                      {formatPrice(plan.priceMonthly)}
                      {plan.priceMonthly > 0 && (
                        <span className="text-sm font-normal text-[--muted-foreground]">/Monat</span>
                      )}
                    </p>
                    {plan.priceYearly > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {formatPrice(plan.priceYearly)}/Jahr — 2 Monate gratis
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="flex-1 space-y-1.5 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[--foreground]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-px" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full text-center py-2 rounded-lg text-xs font-medium bg-[--muted] text-[--muted-foreground]">
                  Aktueller Plan
                </div>
              ) : isEnterprise ? (
                <a
                  href="mailto:enterprise@xcare.de?subject=Enterprise-Anfrage"
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-[--muted] text-[--foreground] hover:bg-[--border] transition-colors"
                >
                  Kontakt aufnehmen
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <UpgradeButton
                  planId={plan.id}
                  planName={plan.name}
                  highlight={plan.highlight}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center text-xs text-[--muted-foreground]">
        Alle Preise zzgl. gesetzlicher MwSt. · Monatlich kündbar · Sichere Zahlung über Stripe ·{" "}
        <a href="/agb" className="underline hover:text-[--foreground]">AGB</a> ·{" "}
        <a href="/datenschutz" className="underline hover:text-[--foreground]">Datenschutz</a>
      </p>
    </div>
  );
}
