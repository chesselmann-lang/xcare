"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, X, User, LogOut, Search, Compass } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface NavbarProps {
  profile?: Profile | null;
}

export function Navbar({ profile }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[--border] bg-[--background]/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-[--primary]">
          <Heart className="h-6 w-6 fill-[--primary]" />
          <span className="text-xl">xcare</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/lotse"
            className="flex items-center gap-1.5 text-sm text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          >
            <Compass className="h-4 w-4" />
            Lotse
          </Link>
          <Link
            href="/suche"
            className="flex items-center gap-1.5 text-sm text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          >
            <Search className="h-4 w-4" />
            Anbieter suchen
          </Link>
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {profile ? (
            <>
              <Link
                href={profile.role === "anbieter" ? "/anbieter" : "/familie"}
              >
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {profile.vorname ?? profile.email}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Anmelden
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Kostenlos registrieren</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-[--muted]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[--border] bg-[--background] p-4 space-y-2">
          <Link href="/lotse" className="flex items-center gap-2 p-2 rounded-lg hover:bg-[--muted]">
            <Compass className="h-4 w-4" /> Lotse
          </Link>
          <Link href="/suche" className="flex items-center gap-2 p-2 rounded-lg hover:bg-[--muted]">
            <Search className="h-4 w-4" /> Anbieter suchen
          </Link>
          {profile ? (
            <>
              <Link
                href={profile.role === "anbieter" ? "/anbieter" : "/familie"}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-[--muted]"
              >
                <User className="h-4 w-4" /> Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 p-2 w-full rounded-lg hover:bg-[--muted] text-left"
              >
                <LogOut className="h-4 w-4" /> Abmelden
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full">Anmelden</Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button className="w-full">Registrieren</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
