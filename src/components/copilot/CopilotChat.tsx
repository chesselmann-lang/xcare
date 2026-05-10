"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Bot, User, Loader2, CheckCircle2, Search, Pill, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CopilotChunk, ToolCallInfo } from "@/lib/ai/copilot";

interface Message {
  id: string;
  rolle: "user" | "assistant" | "system";
  inhalt: string;
  toolCalls?: Array<{ tool: ToolCallInfo; status: "loading" | "done" }>;
}

function ToolBadge({ tool, status }: { tool: ToolCallInfo; status: "loading" | "done" }) {
  const icons: Record<string, React.ElementType> = {
    check_eligibility: CheckCircle2,
    find_provider: Search,
    get_medication_info: Pill,
    calculate_benefits: Calculator,
  };
  const Icon = icons[tool.name] ?? Bot;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      status === "loading"
        ? "bg-blue-50 border-blue-200 text-blue-700"
        : "bg-green-50 border-green-200 text-green-700"
    }`}>
      {status === "loading" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {tool.label}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.rolle === "user";
  const isSystem = msg.rolle === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-[--muted-foreground] bg-[--muted] px-3 py-1 rounded-full">
          {msg.inhalt}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-[--primary] text-white" : "bg-[--muted] text-[--primary]"
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Tool Calls */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.toolCalls.map((tc, i) => (
              <ToolBadge key={i} tool={tc.tool} status={tc.status} />
            ))}
          </div>
        )}

        {/* Nachricht */}
        {msg.inhalt && (
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-[--primary] text-white rounded-br-sm"
              : "bg-[--muted] text-[--foreground] rounded-bl-sm"
          }`}>
            {msg.inhalt}
          </div>
        )}
      </div>
    </div>
  );
}

export interface CopilotChatProps {
  kontext?: { lebenslage?: string; pflegegrad?: number; plz?: string };
}

export function CopilotChat({ kontext = {} }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      rolle: "assistant",
      inhalt:
        "Hallo! Ich bin Ihr xcare KI-Co-Pilot. Ich helfe Ihnen bei Fragen zu Pflegeleistungen, Sozialrecht, Ansprüchen und passenden Anbietern in Ihrer Nähe.\n\nWas kann ich für Sie tun?",
    },
  ]);
  const [eingabe, setEingabe] = useState("");
  const [laden, setLaden] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Verlauf für API (nur user/assistant, max 10 Nachrichten)
  function getVerlauf() {
    return messages
      .filter((m) => m.rolle === "user" || m.rolle === "assistant")
      .filter((m) => m.inhalt)
      .slice(-10)
      .map((m) => ({ rolle: m.rolle as "user" | "assistant", inhalt: m.inhalt }));
  }

  async function senden() {
    const frage = eingabe.trim();
    if (!frage || laden) return;

    setEingabe("");
    setLaden(true);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      rolle: "user",
      inhalt: frage,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      rolle: "assistant",
      inhalt: "",
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frage, kontext, verlauf: getVerlauf() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Fehler");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Kein Stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;

          let chunk: CopilotChunk;
          try { chunk = JSON.parse(raw); } catch { continue; }

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantMsgId) return m;

              if (chunk.type === "text") {
                return { ...m, inhalt: m.inhalt + chunk.content };
              }
              if (chunk.type === "tool_start") {
                return {
                  ...m,
                  toolCalls: [
                    ...(m.toolCalls ?? []),
                    { tool: chunk.tool, status: "loading" as const },
                  ],
                };
              }
              if (chunk.type === "tool_end") {
                return {
                  ...m,
                  toolCalls: (m.toolCalls ?? []).map((tc) =>
                    tc.tool.name === chunk.tool.name
                      ? { ...tc, status: "done" as const }
                      : tc
                  ),
                };
              }
              if (chunk.type === "error") {
                return { ...m, inhalt: chunk.message };
              }
              return m;
            })
          );
        }
      }
    } catch (err) {
      toast.error((err as Error).message || "Fehler beim Senden.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setLaden(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      senden();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[700px] rounded-2xl border border-[--border] bg-[--card] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[--border] bg-[--background]">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[--primary]/10 text-[--primary]">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">xcare KI-Co-Pilot</p>
          <p className="text-xs text-[--muted-foreground]">Sozialberatung · Ansprüche · Anbieter</p>
        </div>
        <div className="ml-auto">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {laden && messages[messages.length - 1]?.rolle === "assistant" && !messages[messages.length - 1]?.inhalt && !(messages[messages.length - 1]?.toolCalls?.length) && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[--muted] flex items-center justify-center text-[--primary]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[--muted]">
              <Loader2 className="h-4 w-4 animate-spin text-[--muted-foreground]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[--border] bg-[--background]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stellen Sie Ihre Frage… (Enter zum Senden, Shift+Enter für neue Zeile)"
            rows={2}
            disabled={laden}
            className="flex-1 resize-none rounded-xl border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] disabled:opacity-50"
          />
          <Button
            onClick={senden}
            disabled={!eingabe.trim() || laden}
            size="sm"
            className="shrink-0 h-10"
          >
            {laden ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-[--muted-foreground] mt-1.5">
          Kein Ersatz für professionelle Rechts- oder Medizinberatung.
        </p>
      </div>
    </div>
  );
}
