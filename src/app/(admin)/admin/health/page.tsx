"use client";

/**
 * S323: Admin — Plattform Health-Dashboard
 *
 * Zeigt Live-Status von Supabase, Anthropic, Stripe, Resend und Inngest.
 * Daten kommen von GET /api/admin/health; auto-refresh alle 30 s.
 */

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  RefreshCw,
  Activity,
} from "lucide-react";

type ServiceStatus = "ok" | "degraded" | "down" | "unconfigured";

interface ServiceResult {
  name: string;
  status: ServiceStatus;
  latency_ms: number | null;
  detail: string;
}

interface HealthData {
  services: ServiceResult[];
  checked_at: string;
}

const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; color: string; bg: string; border: string; Icon: React.ElementType }
> = {
  ok: {
    label: "Betriebsbereit",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    Icon: CheckCircle2,
  },
  degraded: {
    label: "Eingeschränkt",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    Icon: AlertTriangle,
  },
  down: {
    label: "Nicht erreichbar",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    Icon: XCircle,
  },
  unconfigured: {
    label: "Nicht konfiguriert",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    Icon: MinusCircle,
  },
};

/** Overall platform status derived from individual services. */
function overallStatus(services: ServiceResult[]): ServiceStatus {
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  if (services.every((s) => s.status === "unconfigured")) return "unconfigured";
  return "ok";
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function ServiceCard({ svc }: { svc: ServiceResult }) {
  const cfg = STATUS_CONFIG[svc.status];
  const { Icon } = cfg;
  return (
    <div className={`rounded-xl border p-5 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`h-5 w-5 shrink-0 ${cfg.color}`} />
          <div className="min-w-0">
            <p className={`font-semibold text-sm ${cfg.color}`}>{svc.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{svc.detail}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={svc.status} />
          {svc.latency_ms !== null && (
            <p className="text-xs text-gray-400 mt-1">{svc.latency_ms} ms</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30 s
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const overall = data ? overallStatus(data.services) : null;
  const overallCfg = overall ? STATUS_CONFIG[overall] : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Plattform Health-Status
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live-Status aller externen Services · Auto-Refresh alle 30 s
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* Overall status banner */}
      {overall && overallCfg && (
        <div className={`rounded-xl border p-4 flex items-center justify-between ${overallCfg.bg} ${overallCfg.border}`}>
          <div className="flex items-center gap-2.5">
            <overallCfg.Icon className={`h-5 w-5 ${overallCfg.color}`} />
            <span className={`font-semibold ${overallCfg.color}`}>
              Gesamtstatus: {overallCfg.label}
            </span>
          </div>
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Zuletzt geprüft: {lastRefresh.toLocaleTimeString("de-DE")}
            </span>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Health-Check fehlgeschlagen: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Service cards */}
      {data && (
        <div className="grid gap-3">
          {data.services.map((svc) => (
            <ServiceCard key={svc.name} svc={svc} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <p className="text-xs font-medium text-gray-500 mb-3">Legende</p>
        <div className="flex flex-wrap gap-3">
          {(Object.entries(STATUS_CONFIG) as [ServiceStatus, typeof STATUS_CONFIG[ServiceStatus]][]).map(
            ([key, cfg]) => {
              const { Icon } = cfg;
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  <span>{cfg.label}</span>
                </div>
              );
            }
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Timeout: 5 s pro Service. Latenz in Millisekunden (Server-seitig gemessen).
        </p>
      </div>
    </div>
  );
}
