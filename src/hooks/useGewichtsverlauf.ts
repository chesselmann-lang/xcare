"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ActionResult } from "@/lib/schemas/bewohner-protokoll";

interface GewichtsEintrag {
  id: string;
  datum: string;
  uhrzeit?: string;
  gewicht_kg: number;
  bmi?: number;
  zustand?: string;
  notizen?: string;
  created_at: string;
}

interface VitalwertEintrag {
  id: string;
  datum: string;
  uhrzeit?: string;
  blutdruck_systolisch?: number;
  blutdruck_diastolisch?: number;
  herzfrequenz?: number;
  temperatur?: number;
  sauerstoffsaettigung?: number;
  notizen?: string;
}

interface Normwerte {
  zielgewicht_kg?: number;
  gewicht_untergrenzen_kg?: number;
  gewicht_obergrenzen_kg?: number;
}

interface GewichtStats {
  aktuellKg: number | null;
  vormonatKg: number | null;
  deltaKg: number | null;
  bmiAktuell: number | null;
  trend: "steigend" | "fallend" | "stabil" | null;
}

interface GewichtsverlaufState {
  eintraege: GewichtsEintrag[];
  vitalwerte: VitalwertEintrag[];
  normwerte: Normwerte | null;
  stats: GewichtStats;
  loading: boolean;
  error: string | null;
}

interface UseGewichtsverlaufReturn extends GewichtsverlaufState {
  refresh: () => void;
  addGewicht: (
    data: Omit<GewichtsEintrag, "id" | "created_at">
  ) => Promise<ActionResult<GewichtsEintrag>>;
  addVital: (
    data: Omit<VitalwertEintrag, "id">
  ) => Promise<ActionResult<VitalwertEintrag>>;
}

function computeStats(eintraege: GewichtsEintrag[]): GewichtStats {
  if (eintraege.length === 0) {
    return { aktuellKg: null, vormonatKg: null, deltaKg: null, bmiAktuell: null, trend: null };
  }
  const sorted = [...eintraege].sort((a, b) => b.datum.localeCompare(a.datum));
  const aktuell = sorted[0];
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const vormonat = sorted.find((e) => e.datum <= cutoff) ?? null;

  const delta =
    vormonat && aktuell.gewicht_kg !== vormonat.gewicht_kg
      ? Math.round((aktuell.gewicht_kg - vormonat.gewicht_kg) * 10) / 10
      : null;

  const trend: GewichtStats["trend"] =
    delta === null ? "stabil" : delta > 0.5 ? "steigend" : delta < -0.5 ? "fallend" : "stabil";

  return {
    aktuellKg: aktuell.gewicht_kg,
    vormonatKg: vormonat?.gewicht_kg ?? null,
    deltaKg: delta,
    bmiAktuell: aktuell.bmi ?? null,
    trend,
  };
}

export function useGewichtsverlauf(bewohnerId: string): UseGewichtsverlaufReturn {
  const abortRef = useRef<AbortController | null>(null);
  const [rawEintraege, setRawEintraege] = useState<GewichtsEintrag[]>([]);
  const [vitalwerte, setVitalwerte] = useState<VitalwertEintrag[]>([]);
  const [normwerte, setNormwerte] = useState<Normwerte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeStats(rawEintraege), [rawEintraege]);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    fetch(`/api/bewohner/${bewohnerId}/gewicht`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (ctrl.signal.aborted) return;
        setRawEintraege(json.eintraege ?? []);
        setVitalwerte(json.vitalwerte ?? []);
        setNormwerte(json.normwerte ?? null);
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

  const addGewicht = useCallback(
    async (
      data: Omit<GewichtsEintrag, "id" | "created_at">
    ): Promise<ActionResult<GewichtsEintrag>> => {
      try {
        const res = await fetch(`/api/bewohner/${bewohnerId}/gewicht`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
        }
        const created = (await res.json()) as GewichtsEintrag;
        setRawEintraege((prev) => [created, ...prev]);
        return { ok: true, data: created };
      } catch (e: unknown) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      }
    },
    [bewohnerId]
  );

  const addVital = useCallback(
    async (
      data: Omit<VitalwertEintrag, "id">
    ): Promise<ActionResult<VitalwertEintrag>> => {
      try {
        const res = await fetch(`/api/bewohner/${bewohnerId}/gewicht`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, type: "vital" }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
        }
        const created = (await res.json()) as VitalwertEintrag;
        setVitalwerte((prev) => [created, ...prev]);
        return { ok: true, data: created };
      } catch (e: unknown) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      }
    },
    [bewohnerId]
  );

  return {
    eintraege: rawEintraege,
    vitalwerte,
    normwerte,
    stats,
    loading,
    error,
    refresh: load,
    addGewicht,
    addVital,
  };
}
