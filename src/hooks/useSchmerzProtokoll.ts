"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ActionResult } from "@/lib/schemas/bewohner-protokoll";

interface SchmerzEintrag {
  id: string;
  datum: string;
  uhrzeit?: string;
  nrs_wert: number;
  lokalisation?: string;
  charakter?: string;
  begleiterscheinungen?: string;
  massnahmen?: string;
  massnahmen_wirkung?: string;
  notizen?: string;
  created_at: string;
}

interface SchmerzAssessment {
  id: string;
  datum: string;
  instrument: string;
  gesamtscore?: number;
  zielwert_nrs?: number;
  massnahmenplan?: string;
  naechste_bewertung?: string;
}

interface SchmerzStats {
  avgNrs: number | null;
  maxNrs: number | null;
  eintraegeCount: number;
  letztesAssessment: SchmerzAssessment | null;
}

interface SchmerzProtokollState {
  eintraege: SchmerzEintrag[];
  stats: SchmerzStats;
  loading: boolean;
  error: string | null;
}

interface UseSchmerzProtokollOptions {
  sinceDays?: number;
}

interface UseSchmerzProtokollReturn extends SchmerzProtokollState {
  refresh: () => void;
  addEintrag: (
    data: Omit<SchmerzEintrag, "id" | "created_at">
  ) => Promise<ActionResult<SchmerzEintrag>>;
}

export function useSchmerzProtokoll(
  bewohnerId: string,
  options: UseSchmerzProtokollOptions = {}
): UseSchmerzProtokollReturn {
  const { sinceDays = 90 } = options;
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<SchmerzProtokollState>({
    eintraege: [],
    stats: { avgNrs: null, maxNrs: null, eintraegeCount: 0, letztesAssessment: null },
    loading: true,
    error: null,
  });

  const since = new Date(Date.now() - sinceDays * 86400000)
    .toISOString()
    .split("T")[0];

  const load = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(`/api/bewohner/${bewohnerId}/schmerz?since=${since}`, {
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (ctrl.signal.aborted) return;
        setState({
          eintraege: json.eintraege ?? [],
          stats: {
            avgNrs: json.avgNrs,
            maxNrs: json.maxNrs,
            eintraegeCount: (json.eintraege ?? []).length,
            letztesAssessment: json.latestAssessment ?? null,
          },
          loading: false,
          error: null,
        });
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Unbekannter Fehler",
        }));
      });
  }, [bewohnerId, since]);

  useEffect(() => {
    if (!bewohnerId) return;
    load();
    return () => abortRef.current?.abort();
  }, [bewohnerId, load]);

  const addEintrag = useCallback(
    async (
      data: Omit<SchmerzEintrag, "id" | "created_at">
    ): Promise<ActionResult<SchmerzEintrag>> => {
      try {
        const res = await fetch(`/api/bewohner/${bewohnerId}/schmerz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
        }
        const created = (await res.json()) as SchmerzEintrag;
        setState((s) => ({
          ...s,
          eintraege: [created, ...s.eintraege],
          stats: {
            ...s.stats,
            eintraegeCount: s.stats.eintraegeCount + 1,
          },
        }));
        return { ok: true, data: created };
      } catch (e: unknown) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Netzwerkfehler",
        };
      }
    },
    [bewohnerId]
  );

  return { ...state, refresh: load, addEintrag };
}
