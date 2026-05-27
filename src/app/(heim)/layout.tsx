import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  LayoutDashboard, Users, ClipboardList, Star, BarChart2,
  Settings, LogOut, Building2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/heim/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/heim/bewohner", label: "Bewohner", icon: Users },
  { href: "/heim/dienstplan", label: "Dienstplan", icon: ClipboardList },
  { href: "/heim/qualitaet", label: "Qualität", icon: Star },
  { href: "/heim/berichte", label: "Berichte", icon: BarChart2 },
  { href: "/heim/einstellungen", label: "Einstellungen", icon: Settings },
];

export default async function HeimLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load Einrichtung name for header
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("id, name, typ")
    .eq("leiter_user_id", user.id)
    .maybeSingle();

  // Also allow Mitarbeiter access
  const { data: mitarbeiterEinrichtung } = !einrichtung
    ? await supabase
        .from("einrichtungen")
        .select("id, name, typ")
        .in(
          "id",
          (
            await supabase
              .from("dienstplan")
              .select("einrichtung_id")
              .eq("mitarbeiter_id", user.id)
              .limit(1)
          ).data?.map((d) => d.einrichtung_id) ?? []
        )
        .maybeSingle()
    : { data: null };

  const heim = einrichtung ?? mitarbeiterEinrichtung;
  if (!heim) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Dark navy sidebar */}
      <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">xcare OS</p>
              <p className="text-slate-500 text-[10px] leading-tight">für Einrichtungen</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors group"
            >
              <Icon className="h-4 w-4 shrink-0 group-hover:text-blue-400 transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <form action="/api/auth/logout" method="POST">
            <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header with Einrichtungsname */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white truncate">{heim.name}</p>
            <p className="text-xs text-slate-500 capitalize">
              {heim.typ?.replace("_", " ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-full border border-blue-600/30">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              Aktiv
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
