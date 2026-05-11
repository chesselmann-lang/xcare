"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldCheck, Euro, MapPin, Clock, Languages,
  Award, Trash2, Eye, EyeOff, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CareWorker = {
  id: string;
  vorname: string;
  nachname: string;
  qualifikationen: string[];
  sprachen: string[];
  berufserfahrung_jahre?: number | null;
  stundensatz_ct: number;
  verfuegbar_ab?: string | null;
  max_stunden_woche?: number | null;
  fuehrungszeugnis_vorhanden: boolean;
  bio?: string | null;
  plz?: string | null;
  ort?: string | null;
  aktiv: boolean;
  entfernung_m?: number | null;
  anbieter_name?: string;
  anbieter_verifiziert?: boolean;
};

export function CareWorkerCard({
  worker,
  showActions = false,
}: {
  worker: CareWorker;
  showActions?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const stundensatz = (worker.stundensatz_ct / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  const handleToggleAktiv = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/care-workers/${worker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktiv: !worker.aktiv }),
      });
      if (!res.ok) throw new Error("Fehler");
      toast.success(worker.aktiv ? "Profil deaktiviert" : "Profil aktiviert");
      router.refresh();
    } catch {
      toast.error("Statuswechsel fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Pflegekraft ${worker.vorname} ${worker.nachname} löschen?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/care-workers/${worker.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler");
      toast.success("Pflegekraft gelöscht");
      router.refresh();
    } catch {
      toast.error("Löschen fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`p-4 ${!worker.aktiv ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Avatar + Name */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
            {worker.vorname.charAt(0)}{worker.nachname.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {worker.vorname} {worker.nachname}
            </p>
            {worker.anbieter_name && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                {worker.anbieter_name}
                {worker.anbieter_verifiziert && (
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                )}
              </p>
            )}
            {!worker.aktiv && (
              <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                Inaktiv
              </span>
            )}
          </div>
        </div>

        {/* Stundensatz */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-green-700 font-bold text-sm">
            <Euro className="w-3.5 h-3.5" />
            {stundensatz} €/Std.
          </div>
          {worker.max_stunden_woche && (
            <p className="text-xs text-gray-400">max. {worker.max_stunden_woche} h/Woche</p>
          )}
        </div>
      </div>

      {/* Qualifikationen */}
      {worker.qualifikationen.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {worker.qualifikationen.slice(0, 3).map(q => (
            <span key={q} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              <Award className="w-2.5 h-2.5" />{q}
            </span>
          ))}
          {worker.qualifikationen.length > 3 && (
            <span className="text-xs text-gray-400">+{worker.qualifikationen.length - 3}</span>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
        {worker.sprachen.length > 0 && (
          <span className="flex items-center gap-1">
            <Languages className="w-3 h-3" />
            {worker.sprachen.slice(0, 3).join(", ")}
          </span>
        )}
        {worker.berufserfahrung_jahre != null && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {worker.berufserfahrung_jahre} J. Erfahrung
          </span>
        )}
        {(worker.plz || worker.ort) && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {worker.plz} {worker.ort}
          </span>
        )}
        {worker.entfernung_m != null && (
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <MapPin className="w-3 h-3" />
            {worker.entfernung_m < 1000
              ? `${Math.round(worker.entfernung_m)} m`
              : `${(worker.entfernung_m / 1000).toFixed(1)} km`}
          </span>
        )}
        {worker.fuehrungszeugnis_vorhanden && (
          <span className="flex items-center gap-1 text-purple-600">
            <ShieldCheck className="w-3 h-3" />
            Führungszeugnis
          </span>
        )}
        {worker.verfuegbar_ab && (
          <span className="text-gray-400">
            ab {new Date(worker.verfuegbar_ab).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Bio */}
      {worker.bio && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-2">{worker.bio}</p>
      )}

      {/* Actions (Anbieter-Dashboard only) */}
      {showActions && (
        <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAktiv}
            disabled={loading}
            className="text-xs flex items-center gap-1"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : worker.aktiv ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
            {worker.aktiv ? "Deaktivieren" : "Aktivieren"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="text-xs text-red-500 hover:text-red-700 hover:border-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Löschen
          </Button>
        </div>
      )}
    </Card>
  );
}
