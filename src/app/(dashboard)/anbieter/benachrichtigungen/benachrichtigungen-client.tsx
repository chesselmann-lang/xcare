"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";
import { alleAlsGelesenMarkieren, benachrichtigungLoeschen, alleLoeschen } from "./aktionen";
import { toast } from "sonner";

interface Benachrichtigung {
  id: string;
  typ: string;
  titel: string;
  nachricht: string;
  link: string | null;
  gelesen: boolean;
  created_at: string;
}

const TYP_ICON: Record<string, string> = {
  neue_anfrage:   "📬",
  statusupdate:   "🔄",
  neue_nachricht: "💬",
  bewertung:      "⭐",
  kontakt:        "📩",
  system:         "ℹ️",
};

const TYP_COLOR: Record<string, string> = {
  neue_anfrage:   "bg-blue-50 border-blue-200",
  statusupdate:   "bg-amber-50 border-amber-200",
  neue_nachricht: "bg-purple-50 border-purple-200",
  bewertung:      "bg-yellow-50 border-yellow-200",
  kontakt:        "bg-teal-50 border-teal-200",
  system:         "bg-gray-50 border-gray-200",
};

type FilterMode = "alle" | "ungelesen";

export function BenachrichtigungenClient({
  profileId,
  initialItems,
}: {
  profileId: string;
  initialItems: Benachrichtigung[];
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<FilterMode>("alle");
  const [pending, startTransition] = useTransition();

  const unreadCount = items.filter((n) => !n.gelesen).length;

  const visible = filter === "ungelesen"
    ? items.filter((n) => !n.gelesen)
    : items;

  function handleMarkAllRead() {
    startTransition(async () => {
      await alleAlsGelesenMarkieren(profileId);
      setItems((prev) => prev.map((n) => ({ ...n, gelesen: true })));
      toast.success("Alle als gelesen markiert");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await benachrichtigungLoeschen(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    });
  }

  function handleDeleteAll() {
    startTransition(async () => {
      await alleLoeschen(profileId);
      setItems([]);
      toast.success("Alle Benachrichtigungen gelöscht");
    });
  }

  const ItemWrapper = ({ item, children }: { item: Benachrichtigung; children: React.ReactNode }) =>
    item.link ? (
      <Link href={item.link} className="flex-1 min-w-0 cursor-pointer">
        {children}
      </Link>
    ) : (
      <div className="flex-1 min-w-0">{children}</div>
    );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/anbieter">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-[--primary]" />
              Benachrichtigungen
            </h1>
            <p className="text-sm text-[--muted-foreground] mt-0.5">
              {items.length} gesamt · {unreadCount} ungelesen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleMarkAllRead}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Alle gelesen
            </Button>
          )}
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-[--muted-foreground] hover:text-red-600"
              onClick={handleDeleteAll}
              disabled={pending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Alle löschen
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-[--border]">
        {([
          { key: "alle" as FilterMode, label: "Alle", count: items.length },
          { key: "ungelesen" as FilterMode, label: "Ungelesen", count: unreadCount },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              filter === tab.key
                ? "border-[--primary] text-[--primary]"
                : "border-transparent text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filter === tab.key
                  ? "bg-[--primary] text-white"
                  : "bg-[--muted] text-[--muted-foreground]"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-[--muted-foreground]">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">
            {filter === "ungelesen" ? "Keine ungelesenen Benachrichtigungen" : "Keine Benachrichtigungen"}
          </p>
          <p className="text-sm">Neuigkeiten zu Ihren Anfragen und Kontakten erscheinen hier.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => {
            const icon = TYP_ICON[item.typ] ?? "🔔";
            const colorClass = TYP_COLOR[item.typ] ?? "bg-gray-50 border-gray-200";

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-all group ${
                  !item.gelesen ? colorClass : "border-[--border] bg-[--card] opacity-70"
                }`}
              >
                {/* Icon */}
                <div className="text-2xl leading-none shrink-0 mt-0.5">{icon}</div>

                {/* Content */}
                <ItemWrapper item={item}>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${!item.gelesen ? "text-[--foreground]" : "text-[--muted-foreground]"}`}>
                        {item.titel}
                      </p>
                      <span className="text-xs text-[--muted-foreground] shrink-0">
                        {formatRelative(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-[--muted-foreground] mt-0.5 leading-snug">
                      {item.nachricht}
                    </p>
                    {item.link && (
                      <p className="text-xs text-[--primary] mt-1.5 flex items-center gap-0.5 hover:underline">
                        Details ansehen <ArrowRight className="h-3 w-3" />
                      </p>
                    )}
                  </div>
                </ItemWrapper>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={pending}
                  className="shrink-0 p-1 rounded text-[--muted-foreground] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
