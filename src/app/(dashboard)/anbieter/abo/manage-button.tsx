"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";

/**
 * ManageSubscriptionButton
 *
 * Opens the Stripe Customer Portal so the Anbieter can manage their
 * subscription, update payment method, download invoices, or cancel.
 */
export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();

      if (data.stub) {
        toast.info("Stripe noch nicht konfiguriert", {
          description: "Das Billing-Portal steht nach der Stripe-Konfiguration zur Verfügung.",
          duration: 6000,
        });
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Unbekannter Fehler");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error("Portal konnte nicht geöffnet werden", {
        description: err instanceof Error ? err.message : "Bitte versuchen Sie es erneut.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[--card] border border-[--border] text-[--foreground] hover:bg-[--muted] transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Settings2 className="h-4 w-4" />
      )}
      {loading ? "Weiterleitung…" : "Abo verwalten"}
    </button>
  );
}
