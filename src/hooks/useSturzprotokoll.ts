"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ActionResult } from "@/lib/schemas/bewohner-protokoll";

type SturzSchweregrad = "leicht" | "mittel" | "schwer" | "kritisch";

interface SturzEreignis {
  id: string;
  datum: string;
  uhrzeit?: string;
  schweregrad?: SturzSchweregrad;
  ort?: string;
  umstaende?: string;
  verletzungen?: string;
  massnahmen_sofort?: string;
  arzt_informiert?: boolean;
  angehoerige_informiert?: boolean;
  notizen?: string;
  created_at: string;
}

interface SturzStats {
  gesamt: number;
  letzte30Tage: number;
  letzte90Tage: number;
  letzterSturz: string | null;
  schweregradVerteilung: Record<SturzSchweregrad | "unbekannt", number>;
  risikoLevel: "niedrig" | "mittel" | "hoch";
}

interface SturzprotokollState {
  ereignisse: SturzEreignis[];
  stats: SturzStats;
  loading: boolean;
  error: string | null;
}

interface UseSturzprotokollReturn extends SturzprotokollState {
  refresh: () => void;
  addEreignis: (
    data: Omit<SturzEreignis, "id" | "created_at">
  ) => Promise<ActionResult<SturzEreignis>>;
}

function computeSturzStats(ereignisse: SturzEreignis[]): SturzStats {
  const now = Date.now();
  const d30 = new Date(now - 30 * 86400000).toISOString().split("T")[0];
  const d90 = new Date(now - 90 * 86400000).toISOString().split("T")[0];

  const letzte30 = ereignisse.filter((e) => e.datum >= d30).length;
  const letzte90 = ereignisse.filter((e) => e.datum >= d90).length;

  const verteilung: Record<SturzSchweregrad | "unbekannt", number> = {
    leicht: 0,
    mittel: 0,
    schwer: 0,
    kritisch: 0,
    unbekannt: 0,
  };
  for (const e of ereignisse) {
    const key: SturzSchweregrad | "unbekannt" = e.schweregrad ?? "unbekannt";
    verteilung[key] = (verteilung[key] ?? 0) + 1;
  }

  const risikoLevel: SturzStats["risikoLevel"] =
    letzte30 >= 3 || (verteilung.schwer ?? 0) + (verteilung.kritisch ?? 0) >= 1
      ? "hoch"
      : letzte30 >= 1
      ? "mittel"
      : "niedrig";

  const sorted = [...ereignisse].sort((a, b) => b.datum.localeCompare(a.datum));

  return {
    gesamt: ereignisse.length,
    letzte30Tage: letzte30,
    letzte90Tage: letzte90,
    letzterSturz: sorted[0]?.datum ?? null,
    schweregradVerteilung: verteilung,
    risikoLevel,
  };
}

export function useSturzprotokoll(bewohnerId: string): UseSturzprotokollReturn {
  const abortRef = useRef<AbortController | null>(null);
  const [rawEreignisse, setRawEreignisse] = useState<SturzEreignis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeSturzStats(rawEreignisse), [rawEreignisse]);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    fetch(`/api/bewohner/${bewohnerId}/sturzprotokoll`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (ctrl.signal.aborted) return;
        setRawEreignisse(json.ereignisse ?? json ?? []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
        setLoading(false);
      });
  }, [bewohnerId]);

  useEffect(() => {
    if (!bewohnerId) return;
    load();
    return () => abortRef.current?.abort();
  }, [bewohnerId, load]);

  const addEreignis = useCallback(
    async (
      data: Omit<SturzEreignis, "id" | "created_at">
    ): Promise<ActionResult<SturzEreignis>> => {
      try {
        const res = await fetch(`/api/bewohner/${bewohnerId}/sturzprotokoll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
        }
        const created = (await res.json()) as SturzEreignis;
        setRawEreignisse((prev) => [created, ...prev]);
        return { ok: true, data: created };
      } catch (e: unknown) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      }
    },
    [bewohnerId]
  );

  return { ereignisse: rawEreignisse, stats, loading, error, refresh: load, addEreignis };
}
