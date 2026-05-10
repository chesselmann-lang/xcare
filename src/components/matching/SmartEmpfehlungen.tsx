"use client";

// ============================================
// xcare — Smart-Empfehlungen Komponente (Phase 3C)
// Wird im Familie-Dashboard eingebunden
// ============================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchingErgebnisse } from "@/components/matching/MatchingErgebnisse";
import type { AnbieterMatch } from "@/lib/matching/engine";

interface SmartEmpfehlungenProps {
  pflegegrad?: number;
  lebenslage?: string[];
  plz?: string;
}

export function SmartEmpfehlungen({ pflegegrad, lebenslage, plz }: SmartEmpfehlungenProps) {
  const [matches, setMatches] = useState<AnbieterMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ladeEmpfehlungen = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pflegegrad, lebenslage, plz, limit: 5 }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setMatches(data.matches ?? []);
    } catch (err) {
      console.error("[SmartEmpfehlungen] Fehler beim Laden:", err);
      setError("Empfehlungen konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    ladeEmpfehlungen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pflegegrad, plz]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            KI-Empfehlungen für Sie
          </h2>
          <p className="text-xs text-[--muted-foreground] mt-0.5">
            Passende Anbieter basierend auf Ihrem Profil und Ihrer Region
            {pflegegrad ? ` (Pflegegrad ${pflegegrad})` : ""}.
          </p>
        </div>
        <button
          onClick={ladeEmpfehlungen}
          disabled={isLoading}
          className="shrink-0 p-1.5 rounded-lg hover:bg-[--muted] transition-colors disabled:opacity-40"
          title="Empfehlungen aktualisieren"
          aria-label="Empfehlungen aktualisieren"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[--muted-foreground] ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Fehler-Zustand */}
      {error && !isLoading && (
        <div className="text-center py-6 text-[--muted-foreground]">
          <p className="text-xs">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={ladeEmpfehlungen}>
            Erneut versuchen
          </Button>
        </div>
      )}

      {/* Ergebnisse */}
      {!error && (
        <MatchingErgebnisse matches={matches} isLoading={isLoading} />
      )}

      {/* Footer-Link */}
      {!isLoading && !error && (
        <div className="flex justify-center pt-1">
          <Link href="/suche" className="text-xs text-[--primary] hover:underline flex items-center gap-1">
            Alle Anbieter durchsuchen
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
