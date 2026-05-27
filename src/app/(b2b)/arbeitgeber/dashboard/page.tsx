import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Clock,
  Mail,
  Receipt,
  HeadphonesIcon,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Building2,
} from "lucide-react";

export const metadata = { title: "Arbeitgeber-Dashboard | xcare for Business" };

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysRemaining(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default async function ArbeitgeberDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load company (admin view)
  const { data: unternehmen } = await supabase
    .from("unternehmen")
    .select("*")
    .eq("admin_user_id", user.id)
    .single();

  // If not registered as a company admin yet, redirect to registration
  if (!unternehmen) {
    redirect("/arbeitgeber/registrieren");
  }

  // Load recent mitarbeiter
  const { data: mitarbeiter } = await supabase
    .from("unternehmen_mitarbeiter")
    .select("id, rolle, status, beigetreten_am, user_id")
    .eq("unternehmen_id", unternehmen.id)
    .order("beigetreten_am", { ascending: false })
    .limit(5);

  // Load pending invitations count
  const { count: pendingEinladungen } = await supabase
    .from("mitarbeiter_einladungen")
    .select("*", { count: "exact", head: true })
    .eq("unternehmen_id", unternehmen.id)
    .eq("status", "ausstehend");

  const nutzungsrate =
    unternehmen.max_mitarbeiter > 0
      ? Math.round((unternehmen.aktive_mitarbeiter / unternehmen.max_mitarbeiter) * 100)
      : 0;

  // Simulate: 2.3h saved per active employee per month
  const erspartePflegestunden = Math.round(unternehmen.aktive_mitarbeiter * 2.3);

  const planLabel: Record<string, string> = {
    starter: "Starter (bis 10 MA)",
    business: "Business (bis 50 MA)",
    enterprise: "Enterprise (unbegrenzt)",
  };

  const trialDaysLeft = getDaysRemaining(unternehmen.trial_ends_at);
  const isInTrial = unternehmen.subscription_status === "trial";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[--primary]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{unternehmen.name}</h1>
              <p className="text-sm text-gray-500">
                {planLabel[unternehmen.subscription_plan] ?? unternehmen.subscription_plan}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/arbeitgeber/mitarbeiter"
          className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          Mitarbeiter einladen
        </Link>
      </div>

      {/* Trial banner */}
      {isInTrial && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Testphase: noch {trialDaysLeft} {trialDaysLeft === 1 ? "Tag" : "Tage"} verbleibend
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Ihre kostenlose Testphase endet am {formatDate(unternehmen.trial_ends_at)}. Wählen Sie jetzt einen Plan, um den Zugang für Ihre Mitarbeiter zu sichern.
            </p>
            <Link
              href="/arbeitgeber/plan"
              className="inline-block mt-2 text-sm font-medium text-amber-800 underline underline-offset-2"
            >
              Jetzt upgraden &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Aktive Mitarbeiter",
            value: `${unternehmen.aktive_mitarbeiter} / ${unternehmen.max_mitarbeiter}`,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            sub: `${pendingEinladungen ?? 0} Einladungen ausstehend`,
          },
          {
            label: "Nutzungsrate",
            value: `${nutzungsrate} %`,
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-50",
            sub: "Aller verfügbaren Lizenzen",
          },
          {
            label: "Ersparte Pflegestunden",
            value: `~${erspartePflegestunden} h`,
            icon: Clock,
            color: "text-purple-600",
            bg: "bg-purple-50",
            sub: "Geschätzt diesen Monat",
          },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              href: "/arbeitgeber/mitarbeiter",
              icon: UserPlus,
              label: "Mitarbeiter einladen",
              desc: "E-Mail-Einladung senden",
            },
            {
              href: "/arbeitgeber/rechnungen",
              icon: Receipt,
              label: "Rechnung ansehen",
              desc: "Rechnungshistorie & Download",
            },
            {
              href: "/arbeitgeber/support",
              icon: HeadphonesIcon,
              label: "Support kontaktieren",
              desc: "Mo–Fr 9–17 Uhr erreichbar",
            },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-[--primary]/30 hover:bg-[--primary]/5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-[--primary]/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-600 group-hover:text-[--primary]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent mitarbeiter */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Zuletzt beigetreten</h2>
          <Link
            href="/arbeitgeber/mitarbeiter"
            className="text-sm text-[--primary] hover:underline"
          >
            Alle anzeigen &rarr;
          </Link>
        </div>

        {!mitarbeiter || mitarbeiter.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Noch keine Mitarbeiter eingeladen.
            </p>
            <Link
              href="/arbeitgeber/mitarbeiter"
              className="mt-2 inline-block text-sm font-medium text-[--primary] hover:underline"
            >
              Jetzt einladen
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {mitarbeiter.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[--primary]/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[--primary]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{m.rolle}</p>
                    <p className="text-xs text-gray-500">
                      Beigetreten {formatDate(m.beigetreten_am)}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    m.status === "aktiv"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {m.status === "aktiv" ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {m.status === "aktiv" ? "Aktiv" : "Deaktiviert"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
