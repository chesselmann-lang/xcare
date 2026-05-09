"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Compass, Search, FileText, Heart,
  Building2, Package, MessageSquare, Users
} from "lucide-react";
import type { UserRole } from "@/lib/types";

const FAMILIE_ITEMS = [
  { href: "/familie",          label: "Übersicht",   icon: LayoutDashboard, exact: true },
  { href: "/lotse",            label: "Lotse",        icon: Compass },
  { href: "/suche",            label: "Suche",        icon: Search },
  { href: "/familie/anfragen", label: "Anfragen",     icon: FileText },
  { href: "/familie/favoriten",label: "Favoriten",    icon: Heart },
];

const ANBIETER_ITEMS = [
  { href: "/anbieter/dashboard",            label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { href: "/anbieter/profil",     label: "Profil",     icon: Building2 },
  { href: "/anbieter/leistungen", label: "Leistungen", icon: Package },
  { href: "/anbieter/anfragen",   label: "Anfragen",   icon: MessageSquare },
  { href: "/anbieter/team",       label: "Team",       icon: Users },
];

export function MobileBottomNav({ role, badgeCount = 0 }: { role: UserRole; badgeCount?: number }) {
  const pathname = usePathname();
  const items = role === "anbieter" ? ANBIETER_ITEMS : FAMILIE_ITEMS;
  // Show max 5 items on mobile
  const visible = items.slice(0, 5);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[--card] border-t border-[--border] safe-area-bottom"
      aria-label="Mobile Hauptnavigation"
    >
      <div className="flex">
        {visible.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.href.endsWith("/anfragen") && badgeCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
                isActive ? "text-[--primary]" : "text-[--muted-foreground]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[--primary] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area for iPhone home indicator */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
