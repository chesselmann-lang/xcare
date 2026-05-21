"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BannerTyp = "info" | "warning" | "error" | "success";
type Zielgruppe = "alle" | "anbieter" | "familie" | "admin";

interface Banner {
  id: string;
  typ: BannerTyp;
  titel: string | null;
  nachricht: string;
  zielgruppe: Zielgruppe;
  gueltig_bis: string | null;
  aktiv: boolean;
  created_at: string;
}

const TYP_META: Record<
  BannerTyp,
  { label: string; icon: typeof Info; color: string }
> = {
  info: { label: "Info", icon: Info, color: "text-blue-600" },
  warning: {
    label: "Warnung",
    icon: AlertTriangle,
    color: "text-amber-600",
  },
  error: { label: "Fehler", icon: XCircle, color: "text-red-600" },
  success: {
    label: "Erfolg",
    icon: CheckCircle,
    color: "text-green-600",
  },
};

const ZIELGRUPPE_LABELS: Record<Zielgruppe, string> = {
  alle: "Alle",
  anbieter: "Anbieter",
  familie: "Familie",
  admin: "Admin",
};

const EMPTY_FORM = {
  typ: "info" as BannerTyp,
  titel: "",
  nachricht: "",
  zielgruppe: "alle" as Zielgruppe,
  gueltig_bis: "",
};

export default function BannerAdminPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function fetchBanners() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banner");
      if (!res.ok) throw new Error("Fehler beim Laden");
      setBanners(await res.json());
    } catch {
      toast.error("Banner konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBanners();
  }, []);

  function handleCreate() {
    if (!form.nachricht.trim()) {
      toast.error("Nachricht ist erforderlich");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            gueltig_bis: form.gueltig_bis || null,
            titel: form.titel || null,
          }),
        });
        if (!res.ok) throw new Error("Fehler beim Erstellen");
        toast.success("Banner erstellt");
        setForm(EMPTY_FORM);
        setShowForm(false);
        await fetchBanners();
      } catch {
        toast.error("Banner konnte nicht erstellt werden");
      }
    });
  }

  function handleToggle(banner: Banner) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/banner?id=${banner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aktiv: !banner.aktiv }),
        });
        if (!res.ok) throw new Error();
        toast.success(
          banner.aktiv ? "Banner deaktiviert" : "Banner aktiviert"
        );
        await fetchBanners();
      } catch {
        toast.error("Status konnte nicht geändert werden");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Banner wirklich löschen?")) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/banner?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        toast.success("Banner gelöscht");
        await fetchBanners();
      } catch {
        toast.error("Banner konnte nicht gelöscht werden");
      }
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">
            System-Banner
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Wartungsankündigungen und Info-Nachrichten für Nutzer
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity"
          )}
        >
          <Plus className="h-4 w-4" />
          Neuer Banner
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-[--border] bg-[--card] p-5 space-y-4">
          <h2 className="font-semibold text-[--foreground]">
            Neuen Banner erstellen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Typ */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--foreground]">
                Typ
              </label>
              <select
                value={form.typ}
                onChange={(e) =>
                  setForm((f) => ({ ...f, typ: e.target.value as BannerTyp }))
                }
                className={cn(
                  "w-full rounded-lg border border-[--border] bg-[--background]",
                  "px-3 py-2 text-sm text-[--foreground]"
                )}
              >
                {(
                  ["info", "warning", "error", "success"] as BannerTyp[]
                ).map((t) => (
                  <option key={t} value={t}>
                    {TYP_META[t].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Zielgruppe */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--foreground]">
                Zielgruppe
              </label>
              <select
                value={form.zielgruppe}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    zielgruppe: e.target.value as Zielgruppe,
                  }))
                }
                className={cn(
                  "w-full rounded-lg border border-[--border] bg-[--background]",
                  "px-3 py-2 text-sm text-[--foreground]"
                )}
              >
                {(
                  ["alle", "anbieter", "familie", "admin"] as Zielgruppe[]
                ).map((z) => (
                  <option key={z} value={z}>
                    {ZIELGRUPPE_LABELS[z]}
                  </option>
                ))}
              </select>
            </div>

            {/* Titel */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--foreground]">
                Titel{" "}
                <span className="text-[--muted-foreground]">(optional)</span>
              </label>
              <input
                type="text"
                value={form.titel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titel: e.target.value }))
                }
                placeholder="z.B. Wartungsarbeiten"
                className={cn(
                  "w-full rounded-lg border border-[--border] bg-[--background]",
                  "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]"
                )}
              />
            </div>

            {/* Gültig bis */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--foreground]">
                Gültig bis{" "}
                <span className="text-[--muted-foreground]">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.gueltig_bis}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gueltig_bis: e.target.value }))
                }
                className={cn(
                  "w-full rounded-lg border border-[--border] bg-[--background]",
                  "px-3 py-2 text-sm text-[--foreground]"
                )}
              />
            </div>
          </div>

          {/* Nachricht */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Nachricht <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.nachricht}
              onChange={(e) =>
                setForm((f) => ({ ...f, nachricht: e.target.value }))
              }
              rows={3}
              placeholder="Nachricht an die Nutzer..."
              className={cn(
                "w-full rounded-lg border border-[--border] bg-[--background]",
                "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]",
                "resize-none"
              )}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              className={cn(
                "rounded-lg border border-[--border] px-4 py-2 text-sm font-medium",
                "text-[--foreground] hover:bg-[--muted]/40 transition-colors"
              )}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                "bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity",
                "disabled:opacity-50"
              )}
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Erstellen
            </button>
          </div>
        </div>
      )}

      {/* Banner list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[--muted-foreground]" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[--border] py-12 text-center">
          <Info className="h-8 w-8 mx-auto text-[--muted-foreground] mb-3" />
          <p className="text-sm text-[--muted-foreground]">
            Keine Banner vorhanden
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => {
            const meta = TYP_META[banner.typ] ?? TYP_META.info;
            const Icon = meta.icon;
            return (
              <div
                key={banner.id}
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4",
                  "bg-[--card] border-[--border]",
                  !banner.aktiv && "opacity-60"
                )}
              >
                <Icon
                  className={cn("h-5 w-5 shrink-0 mt-0.5", meta.color)}
                  aria-hidden
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {banner.titel && (
                      <span className="font-semibold text-sm text-[--foreground]">
                        {banner.titel}
                      </span>
                    )}
                    <span className="text-xs rounded-full px-2 py-0.5 bg-[--muted] text-[--muted-foreground]">
                      {meta.label}
                    </span>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-[--muted] text-[--muted-foreground]">
                      {ZIELGRUPPE_LABELS[banner.zielgruppe]}
                    </span>
                    {!banner.aktiv && (
                      <span className="text-xs rounded-full px-2 py-0.5 bg-[--muted] text-[--muted-foreground]">
                        Inaktiv
                      </span>
                    )}
                    {banner.gueltig_bis && (
                      <span className="text-xs text-[--muted-foreground]">
                        bis{" "}
                        {new Date(banner.gueltig_bis).toLocaleString("de-DE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[--foreground]">
                    {banner.nachricht}
                  </p>
                  <p className="text-xs text-[--muted-foreground]">
                    Erstellt:{" "}
                    {new Date(banner.created_at).toLocaleString("de-DE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(banner)}
                    disabled={isPending}
                    aria-label={banner.aktiv ? "Deaktivieren" : "Aktivieren"}
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      "text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted]/40"
                    )}
                  >
                    {banner.aktiv ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner.id)}
                    disabled={isPending}
                    aria-label="Löschen"
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      "text-[--muted-foreground] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
