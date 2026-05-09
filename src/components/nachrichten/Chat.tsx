"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

interface Nachricht {
  id: string;
  anfrage_id: string;
  sender_id: string;
  inhalt: string;
  gelesen: boolean;
  created_at: string;
  sender?: { vorname: string | null; nachname: string | null; role: string };
}

interface ChatProps {
  anfrageId: string;
  currentProfileId: string;
  currentRole: "anbieter" | "familie";
  initialNachrichten: Nachricht[];
}

export function Chat({
  anfrageId,
  currentProfileId,
  currentRole,
  initialNachrichten,
}: ChatProps) {
  const [nachrichten, setNachrichten] = useState<Nachricht[]>(initialNachrichten);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [nachrichten, scrollToBottom]);

  // Mark unread messages as read
  useEffect(() => {
    const unread = nachrichten
      .filter((n) => !n.gelesen && n.sender_id !== currentProfileId)
      .map((n) => n.id);

    if (unread.length === 0) return;

    supabase
      .from("nachrichten")
      .update({ gelesen: true })
      .in("id", unread)
      .then(() => {
        setNachrichten((prev) =>
          prev.map((n) => (unread.includes(n.id) ? { ...n, gelesen: true } : n))
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${anfrageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "nachrichten",
          filter: `anfrage_id=eq.${anfrageId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Nachricht;

          // Enrich with sender profile
          const { data: sender } = await supabase
            .from("profiles")
            .select("vorname, nachname, role")
            .eq("id", newMsg.sender_id)
            .single();

          const enriched = { ...newMsg, sender: sender ?? undefined };

          // Avoid duplicate if we added optimistically
          setNachrichten((prev) => {
            if (prev.some((n) => n.id === enriched.id)) return prev;
            return [...prev, enriched];
          });

          // Mark as read immediately if we're the recipient
          if (newMsg.sender_id !== currentProfileId) {
            supabase
              .from("nachrichten")
              .update({ gelesen: true })
              .eq("id", newMsg.id)
              .then(() => {
                setNachrichten((prev) =>
                  prev.map((n) => (n.id === newMsg.id ? { ...n, gelesen: true } : n))
                );
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anfrageId, currentProfileId]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Nachricht = {
      id: optimisticId,
      anfrage_id: anfrageId,
      sender_id: currentProfileId,
      inhalt: text,
      gelesen: false,
      created_at: new Date().toISOString(),
    };
    setNachrichten((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/nachrichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anfrage_id: anfrageId, inhalt: text }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Fehler beim Senden");
      }

      const { data } = await res.json();

      // Replace optimistic with real
      setNachrichten((prev) =>
        prev.map((n) => (n.id === optimisticId ? { ...data, sender: undefined } : n))
      );
    } catch (err) {
      // Remove optimistic on error
      setNachrichten((prev) => prev.filter((n) => n.id !== optimisticId));
      setInput(text);
      toast.error("Nachricht konnte nicht gesendet werden");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isOwn = (msg: Nachricht) => msg.sender_id === currentProfileId;

  const getSenderLabel = (msg: Nachricht) => {
    if (isOwn(msg)) return "Sie";
    if (msg.sender?.vorname) return `${msg.sender.vorname} ${msg.sender.nachname ?? ""}`.trim();
    return currentRole === "anbieter" ? "Familie" : "Anbieter";
  };

  // Group messages: show date separator when day changes
  const withSeparators = nachrichten.reduce<{ type: "separator" | "message"; value: Nachricht | string }[]>(
    (acc, msg, i) => {
      const prev = nachrichten[i - 1];
      const currDay = new Date(msg.created_at).toDateString();
      const prevDay = prev ? new Date(prev.created_at).toDateString() : null;
      if (currDay !== prevDay) {
        acc.push({ type: "separator", value: new Date(msg.created_at).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) });
      }
      acc.push({ type: "message", value: msg });
      return acc;
    },
    []
  );

  return (
    <div className="flex flex-col rounded-xl border border-[--border] bg-[--card] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[--border] bg-[--card]">
        <MessageCircle className="h-4 w-4 text-[--primary]" />
        <h3 className="font-semibold text-sm">Direktnachrichten</h3>
        <span className="ml-auto text-xs text-[--muted-foreground]">
          {nachrichten.length} Nachrichten
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-[240px] max-h-[460px] bg-gradient-to-b from-[--background] to-[--card]">
        {nachrichten.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <MessageCircle className="h-8 w-8 text-[--muted-foreground] opacity-30 mb-3" />
            <p className="text-sm text-[--muted-foreground]">Noch keine Nachrichten</p>
            <p className="text-xs text-[--muted-foreground] mt-1 opacity-70">
              Starten Sie das Gespräch und klären Sie Details direkt.
            </p>
          </div>
        )}

        {withSeparators.map((item, i) => {
          if (item.type === "separator") {
            return (
              <div key={`sep-${i}`} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-[--border]" />
                <span className="text-xs text-[--muted-foreground] shrink-0">{item.value as string}</span>
                <div className="flex-1 h-px bg-[--border]" />
              </div>
            );
          }

          const msg = item.value as Nachricht;
          const own = isOwn(msg);

          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-0.5 ${own ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] text-[--muted-foreground] px-1">
                {getSenderLabel(msg)}
              </span>
              <div
                className={`relative max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  own
                    ? "bg-[--primary] text-white rounded-br-sm"
                    : "bg-white border border-[--border] text-[--foreground] rounded-bl-sm"
                } ${msg.id.startsWith("optimistic-") ? "opacity-70" : ""}`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.inhalt}</p>
              </div>
              <span className="text-[10px] text-[--muted-foreground] px-1">
                {new Date(msg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                {own && (
                  <span className="ml-1.5">
                    {msg.gelesen ? "✓✓" : "✓"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-[--border] bg-[--card]">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 2000))}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht schreiben… (Enter zum Senden, Shift+Enter für Zeilenumbruch)"
          rows={1}
          className="flex-1 resize-none min-h-[38px] max-h-[120px] text-sm rounded-xl"
          disabled={sending}
        />
        <Button
          onClick={send}
          disabled={!input.trim() || sending}
          size="sm"
          className="h-9 w-9 p-0 rounded-xl shrink-0"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
