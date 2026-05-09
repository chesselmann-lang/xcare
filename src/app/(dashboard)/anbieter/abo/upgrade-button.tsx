"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { PlanId } from "@/lib/stripe/plans";

interface Props {
  planId: PlanId;
  planName: string;
  highlight?: boolean;
}

export function UpgradeButton({ planId, planName, highlight }: Props) {
  const [loading, setLoading] = useState(false);
  const [interval, setIntervalMode] = useState<"monthly" | "yearly">("monthly");

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();

      if (data.stub) {
        // Stripe not configured yet — show informational toast
        toast.info("Stripe noch nicht konfiguriert", {
          description: "Hinterlegen Sie STRIPE_SECRET_KEY und Preis-IDs, um Zahlungen zu aktivieren.",
          duration: 8000,
        });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Unbekannter Fehler");
      }
    } catch (err) {
      toast.error("Upgrade fehlgeschlagen", {
        description: err instanceof Error ? err.message : "Bitte versuchen Sie es erneut.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Interval toggle */}
      <div className="flex rounded-lg border border-[--border] overflow-hidden text-[10px] font-medium">
        <button
          onClick={() => setIntervalMode("monthly")}
          className={`flex-1 py-1 transition-colors ${
            interval === "monthly"
              ? "bg-[--primary] text-white"
              : "text-[--muted-foreground] hover:bg-[--muted]"
          }`}
        >
          Monatlich
        </button>
        <button
          onClick={() => setIntervalMode("yearly")}
          className={`flex-1 py-1 transition-colors ${
            interval === "yearly"
              ? "bg-[--primary] text-white"
              : "text-[--muted-foreground] hover:bg-[--muted]"
          }`}
        >
          Jährlich
        </button>
      </div>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
          highlight
            ? "bg-[--primary] text-white hover:bg-[--primary]/90 disabled:bg-[--primary]/60"
            : "bg-[--muted] text-[--foreground] hover:bg-[--border] disabled:opacity-60"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Weiterleitung…
          </>
        ) : (
          `Zu ${planName} wechseln`
        )}
      </button>
    </div>
  );
}
