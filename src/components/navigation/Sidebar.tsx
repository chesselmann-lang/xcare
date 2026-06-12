"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Compass, Search, FileText, Heart,
  Building2, Package, MessageSquare, LogOut, User,
  Menu, X, Settings, Users, CreditCard, FolderOpen, BarChart3, Inbox, Star, Bookmark, BookmarkCheck,
  GitCompareArrows, SlidersHorizontal, Bell, Images, Home, Lock, Activity, Bot, ClipboardList, Wallet, Euro,
  AlertTriangle, Pill, Award, RefreshCcw, PinIcon, Stethoscope, Briefcase, Upload, FileSearch, Building, Receipt, Calculator, Brain, PiggyBank
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeAnfragenCount } from "@/components/navigation/RealtimeBadge";
import { NotificationBell } from "@/components/navigation/NotificationBell";
import type { Profile } from "@/lib/types";

interface SidebarProps {
  profile: Profile;
  offeneAnfragenCount?: number;
  /** anbieter.id or profile.id depending on role — for realtime subscription */
  entityId?: string;
  /** profile.id for in-app notification bell */
  profileId?: string;
  initialUnreadCount?: number;
  /** Unread direct-message count — shown as badge on Nachrichten nav item */
  unreadNachrichten?: number;
}

const FAMILIE_NAV = [
  { href: "/familie", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/familie/haushalt", label: "Haushalt & Vollmachten", icon: Home },
  { href: "/familie/dokumente", label: "Dokumenten-Tresor", icon: Lock },
  { href: "/lotse", label: "KI-Lotse", icon: Compass },
  { href: "/suche", label: "Anbieter suchen", icon: Search },
  { href: "/pflegekraefte", label: "Pflegekräfte finden", icon: Users },
  { href: "/familie/anfragen", label: "Meine Anfragen", icon: FileText },
  { href: "/familie/nachrichten", label: "Nachrichten", icon: Inbox, nachrichtenBadge: true },
  { href: "/familie/benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { href: "/familie/favoriten", label: "Favoriten", icon: Heart },
  { href: "/familie/merkliste", label: "Merkliste", icon: BookmarkCheck },
  { href: "/familie/gespeicherte-suchen", label: "Gespeicherte Suchen", icon: Bookmark },
  { href: "/familie/vergleich", label: "Anbieter vergleichen", icon: GitCompareArrows },
  { href: "/familie/pflegeplan", label: "Pflegeplan & Termine", icon: ClipboardList },
  { href: "/familie/pflegedokumentation", label: "Pflegedokumentation", icon: FileText },
  { href: "/familie/pflegetagebuch", label: "Pflegetagebuch", icon: BookmarkCheck },
  { href: "/familie/wohlbefinden", label: "Wohlbefinden", icon: Heart },
  { href: "/familie/notfall", label: "Notfallplan", icon: AlertTriangle },
  { href: "/familie/pflegegrad", label: "Pflegegrad", icon: Stethoscope },
  { href: "/familie/pflegegrad-coach", label: "KI Pflegegrad-Coach", icon: Brain },
  { href: "/familie/uebergabe", label: "Übergaben", icon: RefreshCcw },
  { href: "/familie/pinnwand", label: "Pinnwand", icon: PinIcon },
  { href: "/familie/medikamente", label: "Medikamente", icon: Pill },
  { href: "/familie/zahlungen", label: "Zahlungen", icon: CreditCard },
  { href: "/familie/finanzen", label: "Finanz-Hub", icon: Wallet },
  { href: "/familie/budget", label: "Budget-Übersicht", icon: PiggyBank },
  { href: "/familie/kostenrechner", label: "Kostenrechner", icon: Calculator },
  { href: "/familie/gesundheit", label: "Gesundheits-Hub", icon: Activity },
  { href: "/familie/copilot", label: "KI-Co-Pilot", icon: Bot },
  { href: "/familie/leistungen", label: "Leistungen & Ansprüche", icon: Euro },
  { href: "/familie/einstellungen", label: "Einstellungen", icon: SlidersHorizontal },
];

const TRAEGER_NAV = [
  { href: "/traeger/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/traeger/klienten", label: "Klienten", icon: Users },
  { href: "/traeger/massenpruefung", label: "Massenprüfung (CSV)", icon: Upload },
  { href: "/traeger/einstellungen", label: "Einstellungen", icon: SlidersHorizontal },
];

const ANBIETER_NAV = [
  { href: "/anbieter/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/anbieter/profil", label: "Mein Profil", icon: Building2 },
  { href: "/anbieter/leistungen", label: "Leistungen", icon: Package },
  { href: "/anbieter/anfragen", label: "Anfragen", icon: MessageSquare, badge: true },
  { href: "/anbieter/nachrichten", label: "Nachrichten", icon: Inbox, nachrichtenBadge: true },
  { href: "/anbieter/benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { href: "/anbieter/bewertungen", label: "Bewertungen", icon: Star },
  { href: "/anbieter/team", label: "Team", icon: Users },
  { href: "/anbieter/schichtplan", label: "Schichtplanung", icon: ClipboardList },
  { href: "/anbieter/dokumentation", label: "Pflegedokumentation", icon: FileText },
  { href: "/anbieter/pflegebericht", label: "KI-Pflegebericht", icon: Brain },
  { href: "/anbieter/compliance", label: "MDK-Compliance", icon: Activity },
  { href: "/anbieter/uebergabe", label: "Übergabe", icon: RefreshCcw },
  { href: "/anbieter/wohlbefinden", label: "Wohlbefinden", icon: Heart },
  { href: "/anbieter/pflegegrad", label: "Pflegegrad", icon: Stethoscope },
  { href: "/anbieter/pflegegrad-monitoring", label: "PG-Monitoring", icon: Activity },
  { href: "/anbieter/interoperabilitaet", label: "Interop-Hub", icon: GitCompareArrows },
  { href: "/anbieter/notfall", label: "Notfall", icon: AlertTriangle },
  { href: "/anbieter/pinnwand", label: "Pinnwand", icon: PinIcon },
  { href: "/anbieter/medikamente", label: "Medikamente", icon: Pill },
  { href: "/anbieter/wundversorgung", label: "Wundversorgung", icon: Activity },
  { href: "/anbieter/zertifikate", label: "Kompetenz-Portfolio", icon: Award },
  { href: "/anbieter/zahlungen", label: "Zahlungen", icon: CreditCard },
  { href: "/anbieter/finanzen", label: "Finanz-Dashboard", icon: BarChart3 },
  { href: "/anbieter/galerie", label: "Galerie", icon: Images },
  { href: "/anbieter/dokumente", label: "Dokumente", icon: FolderOpen },
  { href: "/anbieter/statistiken", label: "Statistiken", icon: BarChart3 },
  { href: "/anbieter/abo", label: "Abo & Pläne", icon: CreditCard },
  { href: "/anbieter/rechnungen", label: "Rechnungen", icon: Receipt },
  { href: "/anbieter/einstellungen", label: "Einstellungen", icon: SlidersHorizontal },
];

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  badge,
  badgeCount,
  nachrichtenBadge,
  nachrichtenCount,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: boolean;
  badgeCount?: number;
  nachrichtenBadge?: boolean;
  nachrichtenCount?: number;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  const showAnfragenBadge = badge && badgeCount != null && badgeCount > 0;
  const showNachrichtenBadge = nachrichtenBadge && nachrichtenCount != null && nachrichtenCount > 0;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative ${
        isActive
          ? "bg-[--primary] text-white shadow-sm"
          : "text-[--muted-foreground] hover:bg-[--muted] hover:text-[--foreground]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {showAnfragenBadge && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
          {badgeCount! > 9 ? "9+" : badgeCount}
        </span>
      )}
      {showNachrichtenBadge && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
          {nachrichtenCount! > 9 ? "9+" : nachrichtenCount}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ profile, offeneAnfragenCount = 0, entityId, profileId, initialUnreadCount = 0, unreadNachrichten = 0 }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  // Realtime count — falls back to server-rendered count if no entityId
  const realtimeCount = useRealtimeAnfragenCount(
    entityId
      ? { anbieterIdOrFamilieId: entityId, role: profile.role as "anbieter" | "familie", initialCount: offeneAnfragenCount }
      : null
  );
  const badgeCount = entityId ? realtimeCount : offeneAnfragenCount;
  const supabase = createClient();

  const navItems =
    profile.role === "anbieter" ? ANBIETER_NAV :
    profile.role === "traeger" ? TRAEGER_NAV :
    FAMILIE_NAV;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const closeMobile = () => setMobileOpen(false);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-[--border]">
        <Link href="/" className="flex items-center gap-2 font-bold text-[--primary]">
          <Heart className="h-6 w-6 fill-[--primary]" />
          <span className="text-xl">xcare</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-[--border]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[--primary-light] text-[--primary] font-semibold text-sm">
            {(profile.vorname?.charAt(0) ?? profile.email.charAt(0)).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {profile.vorname ? `${profile.vorname} ${profile.nachname ?? ""}`.trim() : profile.email}
            </p>
            <p className="text-xs text-[--muted-foreground] capitalize">
              {profile.role === "anbieter" ? "Anbieter" : profile.role === "traeger" ? "Träger / Kommune" : "Familie"}
            </p>
          </div>
          {profileId && (
            <NotificationBell profileId={profileId} initialCount={initialUnreadCount} />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Dashboard-Navigation">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            badgeCount={badgeCount}
            nachrichtenCount={unreadNachrichten}
            onClick={closeMobile}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[--border] space-y-1">
        <Link href={profile.role === "anbieter" ? "/anbieter/profil" : "/familie"} onClick={closeMobile}>
          <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-[--muted-foreground] hover:bg-[--muted] hover:text-[--foreground] transition-all">
            <User className="h-4 w-4" />
            Profil
          </button>
        </Link>
        <Link href="/einstellungen" onClick={closeMobile}>
          <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-[--muted-foreground] hover:bg-[--muted] hover:text-[--foreground] transition-all">
            <Settings className="h-4 w-4" />
            Einstellungen
          </button>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-[--muted-foreground] hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[--border] bg-[--card] h-screen sticky top-0 overflow-hidden" aria-label="Seitennavigation">
        <SidebarContent />
      </aside>

      {/* Mobile: Top Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-[--border] bg-[--background]/95 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold text-[--primary]">
          <Heart className="h-5 w-5 fill-[--primary]" />
          <span className="text-lg">xcare</span>
        </Link>
        <div className="flex items-center gap-1">
          {profileId && (
            <NotificationBell profileId={profileId} initialCount={initialUnreadCount} />
          )}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-[--muted]"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMobile}
          />
          <aside className="relative w-72 bg-[--card] h-full shadow-2xl overflow-y-auto">
            <button
              onClick={closeMobile}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[--muted]"
            >
              <X className="h-5 w-5" />
            </button>

              <SidebarContent />
            </aside>
          </div>
        )}
      </>
    );
  }
