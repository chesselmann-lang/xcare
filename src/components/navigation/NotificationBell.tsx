"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, X, Check, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils";

interface Benachrichtigung {
  id: string;
  typ: string;
  titel: string;
  nachricht: string;
  link: string | null;
  gelesen: boolean;
  created_at: string;
}

const typIcon: Record<string, string> = {
  neue_anfrage: "📬",
  statusupdate: "🔄",
  neue_nachricht: "💬",
  bewertung: "⭐",
  kontakt: "📩",
  system: "ℹ️",
};

export function NotificationBell({ profileId, initialCount = 0 }: { profileId: string; initialCount?: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Benachrichtigung[]>([]);
  const [unread, setUnread] = useState(initialCount);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`benachrichtigungen-${profileId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "benachrichtigungen",
        filter: `profile_id=eq.${profileId}`,
      }, (payload) => {
        setItems((prev) => [payload.new as Benachrichtigung, ...prev]);
        setUnread((c) => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const loadItems = async () => {
    if (loaded) return;
    const { data } = await supabase
      .from("benachrichtigungen")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
    setLoaded(true);
  };

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    loadItems();
  };

  const markAllRead = async () => {
    await supabase.from("benachrichtigungen")
      .update({ gelesen: true })
      .eq("profile_id", profileId)
      .eq("gelesen", false);
    setItems((prev) => prev.map((n) => ({ ...n, gelesen: true })));
    setUnread(0);
  };

  const markRead = async (id: string) => {
    await supabase.from("benachrichtigungen").update({ gelesen: true }).eq("id", id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, gelesen: true } : n));
    setUnread((c) => Math.max(0, c - 1));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-xl hover:bg-[--muted] transition-colors"
        aria-label="Benachrichtigungen"
      >
        <Bell className="h-5 w-5 text-[--muted-foreground]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[--border] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
            <h3 className="font-semibold text-sm">Benachrichtigungen</h3>
            <div className="flex gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-[--muted] text-xs text-[--muted-foreground] flex items-center gap-1">
                  <Check className="h-3 w-3" /> Alle gelesen
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[--muted]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-[--muted-foreground]">
                <Inbox className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Keine Benachrichtigungen</p>
              </div>
            )}
            {items.map((n) => {
              const content = (
                <div
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[--muted]/50 transition-colors ${!n.gelesen ? "bg-blue-50/50" : ""}`}
                  onClick={() => !n.gelesen && markRead(n.id)}
                >
                  <span className="text-lg shrink-0 mt-0.5">{typIcon[n.typ] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.gelesen ? "font-semibold" : "font-medium"} text-[--foreground] leading-snug`}>
                      {n.titel}
                    </p>
                    <p className="text-xs text-[--muted-foreground] mt-0.5 leading-snug line-clamp-2">{n.nachricht}</p>
                    <p className="text-[10px] text-[--muted-foreground] mt-1">{formatRelative(n.created_at)}</p>
                  </div>
                  {!n.gelesen && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                </div>
              );

              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => { markRead(n.id); setOpen(false); }}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        </div>
      )}