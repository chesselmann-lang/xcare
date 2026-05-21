"use client";

/**
 * /admin/feature-flags — Feature-Flags Dashboard (S318)
 *
 * Zeigt alle Feature-Flags in einer Tabelle mit Toggle-Schaltern.
 * Änderungen werden sofort per PATCH an die API gesendet und der
 * Server-Cache entwurtet (revalidateTag).
 */

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, ToggleLeft, ToggleRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FeatureFlag } from "@/lib/feature-flags";

// ── Neue-Flag-Dialog ──────────────────────────────────────────────────────────

interface NewFlagDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function NewFlagDialog({ open, onClose, onSaved }: NewFlagDialogProps) {
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [rollout, setRollout] = useState("100");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!key.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim().toLowerCase().replace(/\s+/g, "_"),
          enabled: false,
          description: description.trim(),
          rollout_percent: Math.max(0, Math.min(100, Number(rollout) || 100)),
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      toast.success(`Flag "${key}" angelegt`);
      onSaved();
      onClose();
      setKey("");
      setDescription("");
      setRollout("100");
    } catch {
      toast.error("Fehler beim Anlegen des Flags");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neues Feature-Flag anlegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="flag-key">Key (snake_case)</Label>
            <Input
              id="flag-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="z.B. neue_funktion"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="flag-desc">Beschreibung</Label>
            <Input
              id="flag-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Features"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="flag-rollout">Rollout % (0–100)</Label>
            <Input
              id="flag-rollout"
              type="number"
              min={0}
              max={100}
              value={rollout}
              onChange={(e) => setRollout(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving || !key.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feature-flags");
      if (!res.ok) throw new Error("Fehler");
      const data = await res.json();
      setFlags(data.flags ?? []);
    } catch {
      toast.error("Fehler beim Laden der Feature-Flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  async function toggleFlag(key: string, current: boolean) {
    setToggling(key);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: !current }),
      });
      if (!res.ok) throw new Error("Fehler");
      const data = await res.json();
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? data.flag : f))
      );
      toast.success(`"${key}" ${!current ? "aktiviert" : "deaktiviert"}`);
    } catch {
      toast.error("Fehler beim Ändern des Flags");
    } finally {
      setToggling(null);
    }
  }

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature-Flags</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Features ohne Redeploy aktivieren oder deaktivieren
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFlags} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Neues Flag
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-[--muted-foreground]">
          <span className="font-semibold text-[--foreground]">{flags.length}</span> Flags gesamt
        </span>
        <span className="text-[--muted-foreground]">
          <span className="font-semibold text-green-600">{enabledCount}</span> aktiv
        </span>
        <span className="text-[--muted-foreground]">
          <span className="font-semibold text-[--foreground]">{flags.length - enabledCount}</span> inaktiv
        </span>
      </div>

      {/* Tabelle */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[--muted-foreground]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Lade Feature-Flags…
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-16 text-[--muted-foreground]">
          <p>Keine Feature-Flags vorhanden.</p>
          <Button className="mt-4" onClick={() => setShowNew(true)}>
            Erstes Flag anlegen
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-[--border] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[--muted]/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[--muted-foreground] w-48">Key</th>
                <th className="text-left px-4 py-3 font-medium text-[--muted-foreground]">Beschreibung</th>
                <th className="text-center px-4 py-3 font-medium text-[--muted-foreground] w-24">Rollout</th>
                <th className="text-right px-4 py-3 font-medium text-[--muted-foreground] w-32">Geändert von</th>
                <th className="text-center px-4 py-3 font-medium text-[--muted-foreground] w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {flags.map((flag) => (
                <tr
                  key={flag.key}
                  className="hover:bg-[--muted]/20 transition-colors"
                >
                  {/* Key */}
                  <td className="px-4 py-3">
                    <code className="text-xs bg-[--muted] px-1.5 py-0.5 rounded font-mono">
                      {flag.key}
                    </code>
                  </td>

                  {/* Beschreibung */}
                  <td className="px-4 py-3 text-[--muted-foreground]">
                    {flag.description || (
                      <span className="italic text-[--muted-foreground]/50">–</span>
                    )}
                  </td>

                  {/* Rollout % */}
                  <td className="px-4 py-3 text-center">
                    {flag.rollout_percent < 100 ? (
                      <Badge variant="outline" className="text-xs">
                        {flag.rollout_percent}%
                      </Badge>
                    ) : (
                      <span className="text-[--muted-foreground]">100%</span>
                    )}
                  </td>

                  {/* Geändert von */}
                  <td className="px-4 py-3 text-right text-xs text-[--muted-foreground] truncate max-w-[8rem]">
                    {flag.updated_by || "–"}
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFlag(flag.key, flag.enabled)}
                      disabled={toggling === flag.key}
                      aria-label={flag.enabled ? `${flag.key} deaktivieren` : `${flag.key} aktivieren`}
                      className="inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {toggling === flag.key ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[--muted-foreground]" />
                      ) : flag.enabled ? (
                        <>
                          <ToggleRight className="h-6 w-6 text-green-500" />
                          <span className="text-xs font-medium text-green-600">An</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-6 w-6 text-[--muted-foreground]" />
                          <span className="text-xs text-[--muted-foreground]">Aus</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <NewFlagDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onSaved={loadFlags}
      />
    </div>
  );
}
