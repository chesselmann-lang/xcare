import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Building2,
  Users,
  LayoutDashboard,
  Receipt,
  HeadphonesIcon,
  LogOut,
  ChevronRight,
} from "lucide-react";

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: unternehmen } = await supabase
    .from("unternehmen")
    .select("id, name, subscription_plan, subscription_status, aktive_mitarbeiter, max_mitarbeiter")
    .eq("admin_user_id", user.id)
    .single();

  const B2B_NAV = [
    { href: "/arbeitgeber/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/arbeitgeber/mitarbeiter", label: "Mitarbeiter", icon: Users },
    { href: "/arbeitgeber/rechnungen", label: "Rechnungen", icon: Receipt },
  ];

  const planLabel: Record<string, string> = {
    starter: "Starter",
    business: "Business",
    enterprise: "Enterprise",
  };

  const statusColor: Record<string, string> = {
    trial: "bg-amber-100 text-amber-700",
    aktiv: "bg-green-100 text-green-700",
    pausiert: "bg-gray-100 text-gray-600",
    gekuendigt: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* B2B Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 shrink-0">
        {/* Brand header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[--primary] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                xcare for Business
              </p>
              {unternehmen ? (
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {unternehmen.name}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Kein Unternehmen</p>
              )}
            </div>
          </div>

          {/* Plan badge */}
          {unternehmen && (
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  statusColor[unternehmen.subscription_status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {unternehmen.subscription_status === "trial" ? "Testphase" :
                 unternehmen.subscription_status === "aktiv" ? "Aktiv" :
                 unternehmen.subscription_status === "pausiert" ? "Pausiert" : "Gekündigt"}
              </span>
              <span className="text-xs text-gray-500">
                {planLabel[unternehmen.subscription_plan] ?? unternehmen.subscription_plan}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {B2B_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors group"
            >
              <Icon className="w-4 h-4 text-gray-500 group-hover:text-gray-700 shrink-0" />
              {label}
              <ChevronRight className="w-3 h-3 ml-auto text-gray-300 group-hover:text-gray-500" />
            </Link>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="px-4 py-4 border-t border-gray-200 space-y-1">
          <Link
            href="/arbeitgeber/support"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <HeadphonesIcon className="w-4 h-4 text-gray-400 shrink-0" />
            Support
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-400 shrink-0" />
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <Building2 className="w-6 h-6 text-[--primary]" />
          <span className="font-semibold text-sm text-gray-900">
            {unternehmen?.name ?? "xcare for Business"}
          </span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
