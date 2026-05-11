"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

const PLAN_OPTIONS = [
  { value: "free", label: "Free (kostenlos)" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
] as const;

type PlanValue = (typeof PLAN_OPTIONS)[number]["value"];

interface Props {
  anbieterId: string;
  currentPlan: string | null;
}

export function PlanOverride({ anbieterId, currentPlan }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanValue>((currentPlan as PlanValue) ?? "free");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/anbieter/${anbieterId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          plan_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      toast.success("Plan aktualisiert", {
        description: `Plan wurde auf „${plan}" gesetzt.`,
      });
      // Refresh the server component so the Abo-Status card reflects the new plan
      router.refresh();
    } catch (err) {
      toast.error("Fehler beim Aktualisieren", {
        description: err instanceof Error ? err.message : "Bitte erneut versuchen.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Compute a sensible default expiry (+30 days) for quick fill
  function setDefaultExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setExpiresAt(d.toISOString().slice(0, 10));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-purple-500" />
        Plan manuell setzen
        <span className="text-xs font-normal text-gray-400 ml-1">(Admin-Override — ohne Stripe)</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanValue)}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-500">
              Ablaufdatum <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <button
              type="button"
              onClick={setDefaultExpiry}
              className="text-xs text-purple-600 hover:underline"
            >
              +30 Tage
            </button>
          </div>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <p className="text-xs text-gray-400 mt-1">
            Leer lassen = kein Ablauf (dauerhaft).
          </p>
        </div>

        <div className="pt-1 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? "Speichern…" : "Plan setzen"}
          </button>
          {currentPlan && (
            <span className="text-xs text-gray-400