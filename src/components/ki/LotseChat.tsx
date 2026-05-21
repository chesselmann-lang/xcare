"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { SprachEingabe } from "@/components/lotse/SprachEingabe";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LebenslageTyp, WizardAntwort } from "@/lib/types";
import { LEBENSLAGEN } from "@/lib/constants";
import {
  markKiRequestStart,
  recordKiTtfb,
  recordKiStreamComplete,
  recordKiError,
} from "@/lib/monitoring/ki-vitals";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LotseChatProps {
  lebenslage: LebenslageTyp;
  antworten: WizardAntwort[];
  plz: string;
  initialMessage?: string;
}

export function LotseChat({ lebenslage, antworten, plz, initialMessage }: LotseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const ll = LEBENSLAGEN[lebenslage];

  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    // ── Performance Tracking (S317) ───────────────────────────────────────────
    const vitalsOpts = { feature: "lotse" as const, lebenslage };
    const measurement = markKiRequestStart(vitalsOpts);
    let ttfbRecorded = false;
    let chunkCount = 0;

    try {
      const res = await fetch("/api/ki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lebenslage, antworten, frage: text, plz }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        chunkCount++;

        // TTFB: erster nicht-leerer Chunk
        if (!ttfbRecorded && chunk.length > 0) {
          recordKiTtfb(measurement, vitalsOpts);
          ttfbRecorded = true;
        }

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }

      recordKiStreamComplete(measurement, vitalsOpts, chunkCount);
    } catch (err) {
      const errorType = err instanceof Error ? err.message : "unknown";
      recordKiError(measurement, vitalsOpts, errorType);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-[--border] bg-[--card]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[--border] bg-[--primary]/5 rounded-t-xl">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[--primary] text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">xcare Lotse</p>
          <p className="text-xs text-[--muted-foreground]">
            {ll.emoji} {ll.label} · PLZ {plz}
          </p>
        </div>
        <span className="ml-auto flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      </div>

      {/* Nachrichten */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[--muted-foreground]">
            <span className="text-4xl mb-3">{ll.emoji}</span>
            <p className="font-medium">Ich bin dein persönlicher Lotse</p>
            <p className="text-sm mt-1">
              Stelle mir eine Frage zu deiner Situation — ich helfe dir weiter.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[--primary] text-white rounded-br-sm"
                  : "bg-[--muted] text-[--foreground] rounded-bl-sm"
              }`}
            >
              {msg.content || (
                <span className="flex items-center gap-1.5 text-[--muted-foreground]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Schreibe…
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Eingabe */}
      <div className="border-t border-[--border] p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Deine Frage…"
          className="min-h-[44px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
        />
        <SprachEingabe
          onTranscript={(t) => setInput((prev) => prev + t)}
          disabled={isLoading}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          size="icon"
          aria-label="Nachricht senden"
          className="shrink-0 self-end"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
