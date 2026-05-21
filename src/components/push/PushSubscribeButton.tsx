"use client";

/**
 * S322: PushSubscribeButton
 *
 * Registers the service worker, requests Notification permission, and
 * subscribes / unsubscribes the browser from Web Push.
 *
 * Usage: drop into any settings page for familie users.
 *
 *   <PushSubscribeButton />
 */

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Pad to multiple of 4
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushSubscribeButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check current subscription state
  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
      setSupported(false);
      setLoading(false);
      return;
    }
    setSupported(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) { setLoading(false); return; }
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Register service worker once on mount
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => checkSubscription())
        .catch(() => checkSubscription());
    } else {
      checkSubscription();
    }
  }, [checkSubscription]);

  const subscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Benachrichtigungen wurden nicht erlaubt.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        }),
      });

      if (!res.ok) throw new Error("Registrierung fehlgeschlagen");
      setSubscribed(true);
      toast.success("Push-Benachrichtigungen aktiviert!");
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
      toast.success("Push-Benachrichtigungen deaktiviert.");
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <BellOff className="h-4 w-4" />
        <span>Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          subscribed
            ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200"
            : "bg-[--primary] text-white hover:opacity-90"
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscribed ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {subscribed ? "Push deaktivieren" : "Push-Benachrichtigungen aktivieren"}
      </button>
      {subscribed && (
        <span className="text-xs text-green-600 flex items-center gap-1">
          <Bell className="h-3 w-3" />
          Aktiv
        </span>
      )}
    </div>
  );
}
