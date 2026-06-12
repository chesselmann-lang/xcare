import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  BarChart3,
  Receipt,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Finanzen | xcare Anbieter",
  description: "Umsatz-Dashboard und Finanzübersicht für Pflegeanbieter",
};

function formatEur(cents: number) {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function monthLabel(key: string) {
  return new Date(key + "-01").toLocaleString("de-DE", { month: "short", year: "2-digit" });
}

type ZahlungStatus = "paid" | "pending" | "failed" | "refunded" | string;

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  paid: {
    label: "Bezahlt",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  pending: {
    label: "Ausstehend",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  failed: {
    label: "Fehlgeschlagen",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  refunded: {
    label: "Erstattet",
    icon: AlertCircle,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
};

export default async function AnbieterFinanzenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "anbieter") redirect("/familie/dashboard");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const yearStart = `${currentYear}-01-01`;
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const prevMonthStart =
    currentMonth === 1
      ? `${currentYear - 1}-12-01`
      : `${currentYear}-${String(currentMonth - 1).padStart(2, "0")}-01`;

  // Zahlungen (Stripe payouts to anbieter)
  const { data: zahlungen } = await supabase
    .from("zahlungen_log")
    .select(
      "id, brutto_ct, netto_ct, provision_ct, status, paid_at, beschreibung, stundennachweis_id"
    )
    .eq("anbieter_id", profile.id)
    .gte("paid_at", yearStart)
    .order("paid_at", { ascending: false });

  // Stundennachweise for billing details
  const { data: nachweise } = await supabase
    .from("stundennachweise")
    .select(
      "id, datum, stunden, stundensatz_ct, betrag_ct, status, payment_status, beschreibung, care_worker_id"
    )
    .eq("anbieter_id", profile.id)
    .gte("datum", yearStart)
    .order("datum", { ascending: false });

  // --- Aggregation ---

  // Current month
  const thisMonth = (zahlungen || []).filter(
    (z) => z.paid_at >= monthStart && z.status === "paid"
  );
  const prevMonth = (zahlungen || []).filter(
    (z) => z.paid_at >= prevMonthStart && z.paid_at < monthStart && z.status === "paid"
  );
  const ytdPaid = (zahlungen || []).filter((z) => z.status === "paid");
  const pending = (zahlungen || []).filter((z) => z.status === "pending");

  const thisMonthNetto = thisMonth.reduce((s, z) => s + (z.netto_ct || 0), 0);
  const prevMonthNetto = prevMonth.reduce((s, z) => s + (z.netto_ct || 0), 0);
  const ytdNetto = ytdPaid.reduce((s, z) => s + (z.netto_ct || 0), 0);
  const pendingNetto = pending.reduce((s, z) => s + (z.netto_ct || 0), 0);
  const ytdProvision = ytdPaid.reduce((s, z) => s + (z.provision_ct || 0), 0);

  const monthChange =
    prevMonthNetto > 0
      ? Math.round(((thisMonthNetto - prevMonthNetto) / prevMonthNetto) * 100)
      : null;

  // Monthly aggregation — last 6 months
  const monthlyData: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = 0;
  }
  for (const z of zahlungen || []) {
    if (z.status !== "paid" || !z.paid_at) continue;
    const key = z.paid_at.substring(0, 7);
    if (key in monthlyData) {
      monthlyData[key] = (monthlyData[key] || 0) + (z.netto_ct || 0);
    }
  }
  const maxMonthly = Math.max(...Object.values(monthlyData), 1);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  const statusNetto: Record<string, number> = {};
  for (const z of zahlungen || []) {
    const s = z.status as ZahlungStatus;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
    statusNetto[s] = (statusNetto[s] || 0) + (z.netto_ct || 0);
  }

  // Hours delivered this year
  const totalStunden = (nachweise || []).reduce((s, n) => s + (n.stunden || 0), 0);
  const avgStundensatz =
    totalStunden > 0
      ? Math.round(
          (nachweise || []).reduce((s, n) => s + (n.stundensatz_ct || 0), 0) /
            (nachweise || []).length || 0
        )
      : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[--primary]" />
            Finanz-Dashboard {currentYear}
          </h1>
          <p className="text-[--muted-foreground] mt-1">
            Umsatz, Auszahlungen und Leistungsübersicht
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/anbieter/zahlungen"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[--primary] text-[--primary-foreground] rounded-lg hover:opacity-90 transition-opacity"
          >
            Stripe Connect
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* This month */}
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[--muted-foreground] text-sm">
            <Banknote className="h-4 w-4 text-green-500" />
            Dieser Monat
          </div>
          <div className="text-xl font-bold text-[--foreground]">
            {formatEur(thisMonthNetto)}
          </div>
          {monthChange !== null && (
            <div
              className={`text-xs flex items-center gap-1 ${
                monthChange >= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {monthChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {monthChange >= 0 ? "+" : ""}
              {monthChange}% vs. Vormonat
            </div>
          )}
        </div>

        {/* YTD */}
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[--muted-foreground] text-sm">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            YTD Netto
          </div>
          <div className="text-xl font-bold text-[--foreground]">
            {formatEur(ytdNetto)}
          </div>
          <div className="text-xs text-[--muted-foreground]">
            Provision: {formatEur(ytdProvision)}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[--muted-foreground] text-sm">
            <Clock className="h-4 w-4 text-amber-500" />
            Ausstehend
          </div>
          <div className="text-xl font-bold text-[--foreground]">
            {formatEur(pendingNetto)}
          </div>
          <div className="text-xs text-[--muted-foreground]">
            {pending.length} Zahlung{pending.length !== 1 ? "en" : ""}
          </div>
        </div>

        {/* Hours */}
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[--muted-foreground] text-sm">
            <Users className="h-4 w-4 text-violet-500" />
            Stunden {currentYear}
          </div>
          <div className="text-xl font-bold text-[--foreground]">
            {totalStunden.toLocaleString("de-DE")} h
          </div>
          <div className="text-xs text-[--muted-foreground]">
            Ø {formatEur(avgStundensatz)}/h
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      {Object.values(monthlyData).some((v) => v > 0) && (
        <div className="bg-[--card] border border-[--border] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[--foreground] mb-4">
            Monatsumsatz (letzte 6 Monate) – Netto nach Provision
          </h2>
          <div className="flex items-end gap-2 h-40">
            {Object.entries(monthlyData).map(([key, val]) => {
              const h = Math.round((val / maxMonthly) * 100);
              const isCurrentMonth = key === `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-[--muted-foreground] text-center leading-tight">
                    {val > 0 ? formatEur(val).replace(",00 €", "") + " €" : ""}
                  </div>
                  <div className="w-full flex items-end justify-center">
                    <div
                      className={`w-full rounded-t-sm min-h-[4px] transition-all ${
                        isCurrentMonth
                          ? "bg-[--primary]"
                          : "bg-[--primary] opacity-50"
                      }`}
                      style={{
                        height: `${Math.max(h, 2)}%`,
                        maxHeight: "96px",
                      }}
                      title={`${monthLabel(key)}: ${formatEur(val)}`}
                    />
                  </div>
                  <div
                    className={`text-xs ${
                      isCurrentMonth
                        ? "text-[--primary] font-semibold"
                        : "text-[--muted-foreground]"
                    }`}
                  >
                    {monthLabel(key)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[--foreground] mb-4">
          Zahlungsstatus-Übersicht
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const count = statusCounts[status] || 0;
            const netto = statusNetto[status] || 0;
            const Icon = cfg.icon;
            return (
              <div key={status} className={`${cfg.bg} rounded-xl p-4 space-y-2`}>
                <div className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                  {cfg.label}
                </div>
                <div className={`text-xl font-bold ${cfg.color}`}>{count}</div>
                <div className="text-xs text-[--muted-foreground]">
                  {formatEur(netto)} Netto
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent transactions */}
      {zahlungen && zahlungen.length > 0 && (
        <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[--border] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[--foreground]">
              Letzte Transaktionen
            </h2>
            <Link
              href="/anbieter/zahlungen"
              className="text-sm text-[--primary] hover:underline flex items-center gap-1"
            >
              Stripe-Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[--border]">
            {zahlungen.slice(0, 12).map((z) => {
              const cfg = STATUS_CONFIG[z.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div
                  key={z.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[--accent] transition-colors"
                >
                  <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[--foreground] truncate">
                      {z.beschreibung || "Pflegeleistung"}
                    </div>
                    <div className="text-xs text-[--muted-foreground]">
                      {z.paid_at
                        ? new Date(z.paid_at).toLocaleDateString("de-DE")
                        : "—"}
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-[--foreground]">
                      {formatEur(z.netto_ct || 0)}
                    </div>
                    {z.provision_ct && z.provision_ct > 0 && (
                      <div className="text-xs text-[--muted-foreground]">
                        −{formatEur(z.provision_ct)} Provision
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!zahlungen || zahlungen.length === 0) && (
        <div className="bg-[--card] border border-[--border] rounded-xl p-10 text-center">
          <Receipt className="h-10 w-10 text-[--muted-foreground] mx-auto mb-3" />
          <p className="font-semibold text-[--foreground]">
            Noch keine Zahlungen in {currentYear}
          </p>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Genehmigen Sie Stundennachweise, damit Auszahlungen verarbeitet werden.
          </p>
          <Link
            href="/anbieter/stunden"
            className="mt-4 inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:opacity-90 transition-opacity"
          >
            Stundennachweise verwalten
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Tip: quality rating */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[--foreground] mb-3 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" />
          Umsatz steigern — Tipps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[--muted-foreground]">
          <div>
            <div className="font-medium text-[--foreground] mb-1">
              Profil vervollständigen
            </div>
            Anbieter mit vollständigem Profil und Zertifikaten erhalten im Schnitt
            40 % mehr Anfragen.
          </div>
          <div>
            <div className="font-medium text-[--foreground] mb-1">
              Schnelle Bestätigung
            </div>
            Stundennachweise innerhalb von 48 h bestätigen verbessert Ihre Bewertung
            und beschleunigt Auszahlungen.
          </div>
          <div>
            <div className="font-medium text-[--foreground] mb-1">
              Nachweise digitalisieren
            </div>
            Laden Sie Qualifikationsnachweise hoch, um bei §37b-Schulungspflichten
            automatisch freigeschaltet zu werden.
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/anbieter/zahlungen", label: "Stripe Connect", icon: "💳" },
          { href: "/anbieter/stunden", label: "Stundennachweise", icon: "⏱️" },
          { href: "/anbieter/profil", label: "Mein Profil", icon: "👤" },
          { href: "/anbieter/bewertungen", label: "Bewertungen", icon: "⭐" },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 p-3 bg-[--card] border border-[--border] rounded-xl hover:bg-[--accent] transition-colors text-sm text-[--foreground]"
          >
            <span>{icon}</span>
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
