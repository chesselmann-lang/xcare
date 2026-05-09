import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Shield, LayoutDashboard, Building2, Users, BarChart3, LogOut, Star } from "lucide-react";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900 text-gray-100 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
          <Shield className="h-5 w-5 text-blue-400" />
          <span className="font-bold text-white">xcare Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/anbieter", label: "Anbieter", icon: Building2 },
            { href: "/admin/nutzer", label: "Nutzer", icon: Users },
            { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
            { href: "/admin/bewertungen", label: "Bewertungen", icon: Star },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <form action="/api/auth/logout" method="POST">
            <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
