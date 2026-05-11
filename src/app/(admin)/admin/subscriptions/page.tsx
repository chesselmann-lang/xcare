import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  CreditCard, TrendingUp, Users, AlertCircle, CheckCircle2,
  BarChart3, ArrowLeft, Clock, XCircle,
} from "lucide-react";
import { PLANS } from "@/lib/stripe/plans";

export const metadata = { title: "Subscriptions – xcare Admin" };

type PlanId = "free" | "starter" | "professional" | "enterprise";

const planLabel: Record<string, string> = {
  free: "Kostenlos",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const planColor: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  professional: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

// Monthly revenue in EUR cents per plan
const planMRR: Record<string, number> = {
  free: 0,
  starter: 2900,
  professional: 7900,
  enterprise: 0,
};

function formatEur(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const adminSupabase = await createAdminClient();

  // Load all Anbieter with plan info
  const { data: anbieter } = await adminSupabase
    .from("anbieter")
    .select("id, name, plan, plan_expires_at, stripe_subscription_id, stripe_customer_id, created_at, profiles!anbieter_profile_id_fkey(email, vorname, nachname)")
    .order("created_at", { ascending: false });

  const allAnbieter = anbieter ?? [];

  // Plan distribution
  const planCounts: Record<string, number> = {};
  let totalMRR = 0;
  let paidCount = 0;
  let expiringCount = 0;
  const now = new Date();
  const in7d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (const a of allAnbieter) {
    const plan = (a.plan as string) ?? "free";
    planCounts[plan] = (planCounts[plan] ?? 0) + 1;
    totalMRR += planMRR[plan] ?? 0;
    if (plan !== "free") paidCount++;
    if (a.plan_expires_at) {
      const exp = new Date(a.plan_expires_at);
      if (exp > now && exp <= in7d) expiringCount++;
    }
  }

  const freeCount = planCounts["free"] ?? 0;
  const conversionRate = allAnbieter.length > 0
    ? ((paidCount / allAnbieter.length) * 100).toFixed(1)
    : "0";

  // Recent paid subscriptions (last 30 days, non-free)
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentPaid = allAnbieter.filter(
    (a) => a.plan !== "free" && a.created_at > since30d
  );

  // Overdue / missing subscriptions: paid plan but no stripe_subscription_id
  const missingStripe = allAnbieter.filter(
    (a) => a.plan !== "free" && !a.stripe_subscription_id
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-[--muted-foreground] hover:text-[--foreground]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[--primary]" />
            Subscription-Dashboard
          </h1>
          <p className="text-sm text-[--muted-foreground]">
            MRR, Plan-Verteilung und Churn-Risiken auf einen Blick
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground] mb-1">MRR (geschätzt)</p>
          <p className="text-2xl font-bold text-green-600">{formatEur(totalMRR)}</p>
          <p className="text-xs text-[--muted-foreground] mt-1">monatlich wiederkehrend</p>
        </div>
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground] mb-1">Zahlende Anbieter</p>
          <p className="text-2xl font-bold">{paidCount}</p>
          <p className="text-xs text-[--muted-foreground] mt-1">von {allAnbieter.length} gesamt</p>
        </div>
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground] mb-1">Conversion Rate</p>
          <p className="text-2xl font-bold">{conversionRate}%</p>
          <p className="text-xs text-[--muted-foreground] mt-1">free → paid</p>
        </div>
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground] mb-1">Läuft ab (7 Tage)</p>
          <p className={`text-2xl font-bold ${expiringCount > 0 ? "text-amber-600" : ""}`}>
            {expiringCount}
          </p>
          <p className="text-xs text-[--muted-foreground] mt-1">Verlängerungs-Risiko</p>
        </div>
      </div>

      {/* Plan distribution */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-5 mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Plan-Verteilung
        </h2>
        <div className="space-y-3">
          {(["free", "starter", "professional", "enterprise"] as PlanId[]).map((pid) => {
            const count = planCounts[pid] ?? 0;
            const pct = allAnbieter.length > 0 ? (count / allAnbieter.length) * 100 : 0;
            const mrr = planMRR[pid] * count;
            return (
              <div key={pid}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor[pid]}`}>
                      {planLabel[pid]}
                    </span>
                    <span className="text-sm font-medium">{count} Anbieter</span>
                  </div>
                  <span className="text-sm text-[--muted-foreground]">
                    {mrr > 0 ? `${formatEur(mrr)}/Monat` : "—"}
                  </span>
                </div>
                <div className="w-full bg-[--muted] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-[--primary] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Expiring soon */}
        <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
          <div className="p-4 border-b border-[--border] flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-sm">Läuft bald ab</h2>
          </div>
          {allAnbieter.filter((a) => {
            if (!a.plan_expires_at || a.plan === "free") return false;
            const exp = new Date(a.plan_expires_at);
            return exp > now && exp <= in7d;
          }).length === 0 ? (
            <div className="p-6 text-center text-sm text-[--muted-foreground]">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
              Keine Abos laufen in 7 Tagen ab.
            </div>
          ) : (
            <div className="divide-y divide-[--border]">
              {allAnbieter
                .filter((a) => {
                  if (!a.plan_expires_at || a.plan === "free") return false;
                  const exp = new Date(a.plan_expires_at);
                  return exp > now && exp <= in7d;
                })
                .map((a) => {
                  const profil = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
                  return (
                    <div key={a.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.name}</p>
                        <p className="text-xs text-[--muted-foreground]">{profil?.email ?? "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor[a.plan ?? "free"]}`}>
                          {planLabel[a.plan ?? "free"]}
                        </span>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Endet {formatDate(a.plan_expires_at!)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Missing Stripe subscription */}
        <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
          <div className="p-4 border-b border-[--border] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h2 className="font-semibold text-sm">Plan ohne Stripe-Abo</h2>
          </div>
          {missingStripe.length === 0 ? (
            <div className="p-6 text-center text-sm text-[--muted-foreground]">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
              Alle bezahlten Anbieter haben ein Stripe-Abo verknüpft.
            </div>
          ) : (
            <div className="divide-y divide-[--border]">
              {missingStripe.slice(0, 8).map((a) => {
                const profil = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
                return (
                  <div key={a.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{a.name}</p>
                      <p className="text-xs text-[--muted-foreground]">{profil?.email ?? "—"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${planColor[a.plan ?? "free"]}`}>
                      {planLabel[a.plan ?? "free"]}
                    </span>
                  </div>
                );
              })}
              {missingStripe.length > 8 && (
                <div className="p-3 text-center text-xs text-[--muted-foreground]">
                  + {missingStripe.length - 8} weitere
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent paid signups (last 30d) */}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        <div className="p-4 border-b border-[--border] flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <h2 className="font-semibold text-sm">Neue bezahlte Abos (30 Tage)</h2>
          <span className="ml-auto text-xs text-[--muted-foreground]">{recentPaid.length}</span>
        </div>
        {recentPaid.length === 0 ? (
          <div className="p-6 text-center text-sm text-[--muted-foreground]">
            Keine neuen bezahlten Anbieter in den letzten 30 Tagen.
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            {recentPaid.map((a) => {
              const profil = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
              return (
                <div key={a.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{a.name}</p>
                    <p className="text-xs text-[--muted-foreground]">{profil?.email ?? "—"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${planColor[a.plan ?? "free"]}`}>
                    {planLabel[a.plan ?? "free"]}
                  </span>
                  <span className="text-xs text-[--muted-foreground] shrink-0">
                    {formatDate(a.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
