"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Users } from "lucide-react";
import { rolleAendern } from "./rollen-aktion";
import { toast } from "sonner";

interface RollenButtonProps {
  profileId: string;
  currentRole: string;
}

const ROLLE_CONFIG = {
  familie: { label: "Familie", bg: "bg-rose-50 text-rose-700", border: "border-rose-200" },
  anbieter: { label: "Anbieter", bg: "bg-blue-50 text-blue-700", border: "border-blue-200" },
};

export function RollenButton({ profileId, currentRole }: RollenButtonProps) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [selectedRolle, setSelectedRolle] = useState<"familie" | "anbieter">(
    currentRole === "familie" ? "anbieter" : "familie"
  );

  if (currentRole === "admin") {
    return (
      <p className="text-xs text-gray-400 leading-relaxed">
        Admin-Rollen können nicht über die UI geändert werden.
      </p>
    );
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await rolleAendern(profileId, selectedRolle);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Rolle geändert zu "${ROLLE_CONFIG[selectedRolle].label}"`);
        setConfirm(false);
      }
    });
  }

  if (confirm) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Rolle ändern</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Rolle wird zu <strong>{ROLLE_CONFIG[selectedRolle].label}</strong> geändert. Der Nutzer
              wird beim nächsten Login auf das entsprechende Dashboard weitergeleitet.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirm(false)}
            disabled={pending}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            Bestätigen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Aktuelle Rolle</p>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          currentRole === "familie"
            ? "bg-rose-50 text-rose-700"
            : "bg-blue-50 text-blue-700"
        }`}>
          {ROLLE_CONFIG[currentRole as "familie" | "anbieter"]?.label ?? currentRole}
        </span>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1.5 font-medium block">Neue Rolle</label>
        <select
          value={selectedRolle}
          onChange={(e) => setSelectedRolle(e.target.value as "familie" | "anbieter")}
          className="w-full h-8 text-sm rounded-lg border border-gray-200 px-2 bg-white text-gray-700"
        >
          {Object.entries(ROLLE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key} disabled={key === currentRole}>
              {cfg.label}{key === currentRole ? " (aktuell)" : ""}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => setConfirm(true)}
        disabled={selectedRolle === currentRole}
        className="w-full text-xs py-2 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-1.5"
      >
        <Users className="h-3.5 w-3.5" />
        Rolle ändern
      </button>
    </div>
  );
}
