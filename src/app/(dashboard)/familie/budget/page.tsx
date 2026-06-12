import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Heart,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Download,
  Plus,
  Home,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Budget-Übersicht | xcare",
  description: "Pflegekassen-Budgets und Finanzübersicht",
};

// SGB XI leistungsarten metadata
const LEISTUNGSART_META: Record<
  string,
  { label: string; icon: string; paragraph: string; farbe: string }
> = {
  sachleistungen: {
    label: "Sachleistungen §36",
    icon: "🏥",
    paragraph: "§36 SGB XI",
    farbe: "blue",
  },
  pflegegeld: {
    label: "Pflegegeld §37",
    icon: "💶",
    paragraph: "§37 SGB XI",
    farbe: "green",
  },
  verhinderungspflege: {
    label: "Verhinderungspflege §39",
    icon: "🔄",
    paragraph: "§39 SGB XI",
    farbe: "violet",
  },
  kurzzeitpflege: {
    label: "Kurzzeitpflege §42",
    icon: "🏨",
    paragraph: "§42 SGB XI",
    farbe: "orange",
  },
  entlastungsbetrag: {
    label: "Entlastungsbetrag §45b",
    icon: "🌟",
    paragraph: "§45b SGB XI",
    farbe: "amber",
  },
  haushaltshilfe: {
    label: "Haushaltshilfe §45a",
    icon: "🏠",
    paragraph: "§45a SGB XI",
    farbe: "teal",
  },
};

const FARB_MAP: Record<
  string,
  { bg: string; bar: string; text: string; border: string }
> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    bar: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/20",
    bar: "bg-green-500",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    bar: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/20",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/20",
    bar: "bg-teal-500",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
};

/** Format a euro number as German currency string */
function eur(amount: number): string {
  return amount.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export default async function FamilieBudgetPage() {
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

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const yearStart = `${currentYear}-01-01`;

  // Pflegekassen budgets for current year
  const { data: budgets } = await supabase
    .from("pflegekassen_budgets")
    .select("id, leistungsart, jahresbudget, verbraucht, jahr")
    .eq("profil_id", profile.id)
    .eq("jahr", currentYear)
    .order("leistungsart");

  const budgetIds = (budgets || []).map((b) => b.id);

  // Budget transactions — only if we have budgets
  const { data: allTransaktionen } =
    budgetIds.length > 0
      ? await supabase
          .from("budget_transaktionen")
          .select("id, betrag, beschreibung, datum, budget_id, beleg_url")
          .in("budget_id", budgetIds)
          .gte("datum", yearStart)
          .order("datum", { ascending: false })
          .limit(50)
      : { data: [] };

  // Pflegekosten — stored in euros, field names: betrag, buchungsdatum
  const { data: pflegekosten } = await supabase
    .from("pflegekosten")
    .select("betrag, kategorie, buchungsdatum, beschreibung")
    .eq("profil_id", profile.id)
    .gte("buchungsdatum", yearStart)
    .order("buchungsdatum", { ascending: false });

  // Monthly aggregation over last 6 months (values in euros)
  const monthlyData: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = 0;
  }
  for (const k of pflegekosten || []) {
    const key = (k.buchungsdatum as string).substring(0, 7);
    if (key in monthlyData) {
      monthlyData[key] = (monthlyData[key] || 0) + (k.betrag || 0);
    }
  }

  // KPI totals — all values in euros
  const totalVerbraucht = (budgets || []).reduce(
    (s, b) => s + (b.verbraucht || 0),
    0
  );
  const totalBudget = (budgets || []).reduce(
    (s, b) => s + (b.jahresbudget || 0),
    0
  );
  const gesamtPflegekosten = (pflegekosten || []).reduce(
    (s, k) => s + (k.betrag || 0),
    0
  );
  const monatlichePflegekosten = (pflegekosten || [])
    .filter((k) => (k.buchungsdatum as string) >= monthStart)
    .reduce((s, k) => s + (k.betrag || 0), 0);

  // §35a EStG estimate: 20% of eligible costs, capped at 4,000 €/year
  const steuerAbzug = Math.min(gesamtPflegekosten * 0.2, 4000);

  // Budget map by leistungsart
  const budgetByArt = (budgets || []).reduce(
    (m, b) => {
      m[b.leistungsart] = b;
      return m;
    },
    {} as Record<
      string,
      {
        id: string;
        leistungsart: string;
        jahresbudget: number;
        verbraucht: number;
        jahr: number;
      }
    >
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-[--primary]" />
            Budget-Übersicht {currentYear}
          </h1>
          <p className="text-[--muted-foreground] mt-1">
            Pflegekassen-Budgets, Ausgaben und Steueroptimierung
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/familie/finanzplaner"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-[--border] rounded-lg hover:bg-[--accent] transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            Finanzplaner
          </Link>
          <Link
            href="/familie/finanzen"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[--primary] text-[--primary-foreground] rounded-lg hover:opacity-90 transition-opacity"
          >
            Finanz-Hub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Gesamt-Budget",
            value: eur(totalBudget),
            icon: PiggyBank,
            color: "text-blue-600",
            sub: `Jahreskontingent ${currentYear}`,
          },
          {
            label: "Verbraucht",
            value: eur(totalVerbraucht),
            icon: TrendingDown,
            color: "text-red-500",
            sub:
              totalBudget > 0
                ? `${Math.round((totalVerbraucht / totalBudget) * 100)} % ausgeschöpft`
                : "Kein Budget hinterlegt",
          },
          {
            label: "Monatl. Kosten",
            value: eur(monatlichePflegekosten),
            icon: Clock,
            color: "text-orange-500",
            sub: new Date().toLocaleString("de-DE", { month: "long" }),
          },
          {
            label: "Steuer-Ersparnis",
            value: eur(steuerAbzug),
            icon: Heart,
            color: "text-green-600",
            sub: "§35a EStG (Schätzung)",
          },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div
            key={label}
            className="bg-[--card] border border-[--border] rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-[--muted-foreground] text-sm">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <div className="text-xl font-bold text-[--foreground]">{value}</div>
            <div className="text-xs text-[--muted-foreground]">{sub}</div>
          </div>
        ))}
      </div>

      {/* Budget Cards per Leistungsart */}
      <div>
        <h2 className="text-lg font-semibold text-[--foreground] mb-3">
          Pflegekassen-Leistungen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(LEISTUNGSART_META).map(([art, meta]) => {
            const budget = budgetByArt[art];
            const jahresbudget = budget?.jahresbudget ?? 0;
            const verbraucht = budget?.verbraucht ?? 0;
            const rest = Math.max(0, jahresbudget - verbraucht);
            const pct =
              jahresbudget > 0
                ? Math.min(100, (verbraucht / jahresbudget) * 100)
                : 0;
            const farben = FARB_MAP[meta.farbe] ?? FARB_MAP.blue;
            const critical = pct >= 90;
            const good = pct < 50 && jahresbudget > 0;

            return (
              <div
                key={art}
                className={`${farben.bg} border ${farben.border} rounded-xl p-5 space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-lg mr-1">{meta.icon}</span>
                    <span className={`font-semibold text-sm ${farben.text}`}>
                      {meta.label}
                    </span>
                    <div className="text-xs text-[--muted-foreground] mt-0.5">
                      {meta.paragraph}
                    </div>
                  </div>
                  {critical ? (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : good ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : null}
                </div>

                {jahresbudget > 0 ? (
                  <>
                    <div>
                      <div className="flex justify-between text-xs text-[--muted-foreground] mb-1">
                        <span>{eur(verbraucht)} verbraucht</span>
                        <span>{Math.round(pct)} %</span>
                      </div>
                      <div className="h-2 bg-[--muted] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            critical
                              ? "bg-red-500"
                              : pct > 70
                              ? "bg-orange-500"
                              : farben.bar
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[--muted-foreground]">
                        Restbudget:{" "}
                        <span className={`font-semibold ${farben.text}`}>
                          {eur(rest)}
                        </span>
                      </span>
                      <span className="text-[--muted-foreground]">
                        / {eur(jahresbudget)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[--muted-foreground] italic">
                    Noch kein Budget eingetragen
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {budgets?.length === 0 && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
            <Home className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Noch keine Budgets eingetragen
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Tragen Sie Ihre Pflegekassen-Bescheide ein, um Budgets zu tracken.
            </p>
            <Link
              href="/familie/finanzen"
              className="mt-3 inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Budget erfassen
            </Link>
          </div>
        )}
      </div>

      {/* Monthly spending chart (CSS bar chart, values in euros) */}
      {Object.values(monthlyData).some((v) => v > 0) && (
        <div className="bg-[--card] border border-[--border] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[--foreground] mb-4">
            Monatliche Ausgaben (letzte 6 Monate)
          </h2>
          <div className="flex items-end gap-2 h-36">
            {Object.entries(monthlyData).map(([key, val]) => {
              const maxVal = Math.max(...Object.values(monthlyData), 1);
              const hPct = Math.round((val / maxVal) * 100);
              const label = new Date(key + "-01").toLocaleString("de-DE", {
                month: "short",
              });
              const isCurrent =
                key ===
                `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
              return (
                <div
                  key={key}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="text-xs text-[--muted-foreground] leading-tight text-center">
                    {val > 0 ? eur(val).replace(",00 €", " €") : ""}
                  </div>
                  <div className="w-full flex items-end justify-center">
                    <div
                      className={`w-full rounded-t-sm min-h-[4px] transition-all ${
                        isCurrent
                          ? "bg-[--primary]"
                          : "bg-[--primary] opacity-50"
                      }`}
                      style={{
                        height: `${Math.max(hPct, 2)}%`,
                        maxHeight: "80px",
                      }}
                      title={`${label}: ${eur(val)}`}
                    />
                  </div>
                  <div
                    className={`text-xs ${
                      isCurrent
                        ? "text-[--primary] font-medium"
                        : "text-[--muted-foreground]"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tax deduction info */}
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
          💡 Steuerliche Hinweise
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-300">
          <div>
            <div className="font-medium mb-1">
              §35a EStG — Haushaltsnahe Dienstleistungen
            </div>
            <div>
              20 % der Kosten absetzbar, max. 4.000 €/Jahr. Gilt für ambulante
              Pflege, Hauswirtschaft und Betreuung.
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">
              §33 EStG — Außergewöhnliche Belastungen
            </div>
            <div>
              Pflegekosten über der zumutbaren Belastung absetzbar.
              Krankheitsbedingte Mehrkosten geltend machen.
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">
              §33b EStG — Pflege-Pauschbetrag
            </div>
            <div>
              Bei Pflegegrad ≥ 2 und häuslicher Pflege: 600–3.600 €/Jahr ohne
              Einzelnachweis.
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">Empfehlung</div>
            <div>
              Alle Belege digital im Dokumenten-Tresor archivieren.
              Steuerberater oder Lohnsteuerhilfeverein hinzuziehen.
            </div>
          </div>
        </div>
        {gesamtPflegekosten > 0 && (
          <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
            <div className="text-sm text-green-700 dark:text-green-300">
              Ihre geschätzte §35a-Ersparnis für {currentYear}:{" "}
              <span className="font-bold text-green-800 dark:text-green-200">
                {eur(steuerAbzug)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent budget transactions */}
      {allTransaktionen && allTransaktionen.length > 0 && (
        <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[--border] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[--foreground]">
              Letzte Budget-Transaktionen
            </h2>
            <Link
              href="/familie/finanzen"
              className="text-sm text-[--primary] hover:underline flex items-center gap-1"
            >
              Alle anzeigen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[--border]">
            {allTransaktionen.slice(0, 10).map((t) => {
              const budget = (budgets || []).find((b) => b.id === t.budget_id);
              const artMeta = budget
                ? LEISTUNGSART_META[budget.leistungsart]
                : null;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[--accent] transition-colors"
                >
                  <div className="text-xl">{artMeta?.icon ?? "💰"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[--foreground] truncate">
                      {t.beschreibung || artMeta?.label || "Ausgabe"}
                    </div>
                    <div className="text-xs text-[--muted-foreground]">
                      {new Date(t.datum).toLocaleDateString("de-DE")}
                      {artMeta && (
                        <span className="ml-1">· {artMeta.paragraph}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600 dark:text-red-400 shrink-0">
                    −{eur(t.betrag)}
                  </div>
                  {t.beleg_url && (
                    <a
                      href={t.beleg_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[--muted-foreground] hover:text-[--foreground] transition-colors"
                      title="Beleg herunterladen"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/familie/pflegegeld", label: "Pflegegeld §37", icon: "💶" },
          {
            href: "/familie/entlastung",
            label: "Entlastung §45a/b",
            icon: "🌟",
          },
          {
            href: "/familie/hilfsmittel",
            label: "Hilfsmittel §40",
            icon: "♿",
          },
          {
            href: "/familie/dokumente",
            label: "Belege & Dokumente",
            icon: "📁",
          },
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
