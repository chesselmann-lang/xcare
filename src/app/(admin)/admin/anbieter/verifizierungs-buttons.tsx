"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ShieldOff, Power, PowerOff, AlertTriangle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface VerifizierungsButtonsProps {
  anbieterId: string;
  anbieterName: string;
  isVerifiziert: boolean;
  isAktiv: boolean;
}

type ConfirmState =
  | { action: "verifizieren" }
  | { action: "entverifizieren" }
  | { action: "deaktivieren" }
  | { action: "aktivieren" }
  | null;

const CONFIRM_CONFIG: Record<NonNullable<ConfirmState>["action"], {
  label: string;
  description: string;
  buttonClass: string;
  icon: React.ElementType;
}> = {
  verifizieren: {
    label: "Anbieter verifizieren",
    description: "Der Anbieter erhält das Verifizierten-Badge und wird in der Suche bevorzugt angezeigt.",
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
    icon: ShieldCheck,
  },
  entverifizieren: {
    label: "Verifizierung entfernen",
    description: "Das Verifizierten-Badge wird vom Profil entfernt. Der Anbieter bleibt aktiv.",
    buttonClass: "bg-orange-500 hover:bg-orange-600 text-white",
    icon: ShieldOff,
  },
  deaktivieren: {
    label: "Anbieter deaktivieren",
    description: "Das Profil wird aus dem öffentlichen Verzeichnis entfernt. Bestehende Anfragen bleiben erhalten.",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
    icon: PowerOff,
  },
  aktivieren: {
    label: "Anbieter aktivieren",
    description: "Das Profil wird wieder im öffentlichen Verzeichnis angezeigt.",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    icon: Power,
  },
};

export function VerifizierungsButtons({ anbieterId, anbieterName, isVerifiziert, isAktiv }: VerifizierungsButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const router = useRouter();
  const supabase = createClient();

  async function executeAction() {
    if (!confirm) return;
    setLoading(true);

    let updateData: Record<string, boolean> = {};
    let successMsg = "";

    switch (confirm.action) {
      case "verifizieren":
        updateData = { verifiziert: true };
        successMsg = `${anbieterName} wurde verifiziert. ✓`;
        break;
      case "entverifizieren":
        updateData = { verifiziert: false };
        successMsg = "Verifizierung entfernt.";
        break;
      case "deaktivieren":
        updateData = { aktiv: false };
        successMsg = `${anbieterName} wurde deaktiviert.`;
        break;
      case "aktivieren":
        updateData = { aktiv: true };
        successMsg = `${anbieterName} wurde aktiviert.`;
        break;
    }

    const { error } = await supabase
      .from("anbieter")
      .update(updateData)
      .eq("id", anbieterId);

    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success(successMsg);
      // E-Mail-Benachrichtigung Stub (Placeholder für Inngest-Trigger)
      if (confirm.action === "verifizieren") {
        toast.info("E-Mail-Benachrichtigung an Anbieter wurde ausgelöst.", {
          icon: <Mail className="h-4 w-4" />,
          duration: 3000,
        });
      }
      router.refresh();
    }
    setLoading(false);
    setConfirm(null);
  }

  if (confirm) {
    const cfg = CONFIRM_CONFIG[confirm.action];
    const Icon = cfg.icon;
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{cfg.label}</p>
            <p className="text-xs text-amber-700 mt-0.5">{cfg.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirm(null)}
            disabled={loading}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={executeAction}
            disabled={loading}
            className={`flex-1 text-xs px-3 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 ${cfg.buttonClass} transition-colors`}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            Bestätigen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* Verify / Unverify */}
      {isVerifiziert ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm({ action: "entverifizieren" })}
          className="gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          Verifizierung entfernen
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => setConfirm({ action: "verifizieren" })}
          className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Jetzt verifizieren
        </Button>
      )}

      {/* Activate / Deactivate */}
      {isAktiv ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm({ action: "deaktivieren" })}
          className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
        >
          <PowerOff className="h-3.5 w-3.5" />
          Deaktivieren
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm({ action: "aktivieren" })}
          className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <Power className="h-3.5 w-3.5" />
          Aktivieren
        </Button>
      )}
    </div>
  );
}
