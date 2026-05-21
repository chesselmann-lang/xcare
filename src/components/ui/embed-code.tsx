"use client";

import { useState } from "react";
import { Copy, Check, Code2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmbedCodeProps {
  /** The anbieter UUID */
  anbieterID: string;
  className?: string;
}

type WidgetVariant = "badge" | "widget";

/**
 * EmbedCode — shows copy-able embed code snippets for the xcare
 * review widget. Offers a badge (small, inline) and a widget (iframe).
 *
 * @example
 * <EmbedCode anbieterID={anbieter.id} />
 */
export function EmbedCode({ anbieterID, className }: EmbedCodeProps) {
  const [copied, setCopied] = useState(false);
  const [variant, setVariant] = useState<WidgetVariant>("widget");

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

  const widgetUrl = `${appUrl}/widget/bewertungen/${anbieterID}`;
  const apiUrl = `${appUrl}/api/widget/bewertungen/${anbieterID}`;

  const snippets: Record<WidgetVariant, string> = {
    widget: `<iframe
  src="${widgetUrl}"
  width="320"
  height="200"
  frameborder="0"
  scrolling="no"
  title="xcare Bewertungen"
  style="border:none;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.12);"
></iframe>`,
    badge: `<a href="${appUrl}/anbieter/${anbieterID}" target="_blank" rel="noopener">
  <img
    src="${apiUrl}?format=badge"
    alt="xcare Bewertungen"
    height="28"
    loading="lazy"
  />
</a>`,
  };

  const code = snippets[variant];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Embed-Code kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Variant selector */}
      <div className="flex gap-2">
        {(["widget", "badge"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-colors",
              variant === v
                ? "border-[--primary] bg-[--primary]/10 text-[--primary]"
                : "border-[--border] text-[--muted-foreground] hover:border-[--foreground]/30"
            )}
          >
            {v === "widget" ? "iFrame-Widget" : "Badge"}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative">
        <pre className="rounded-xl bg-[--muted]/60 border border-[--border] p-4 text-xs text-[--foreground] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Code kopieren"
          className="absolute top-2 right-2 flex items-center gap-1 rounded-lg border border-[--border] bg-[--background] px-2 py-1 text-xs font-medium hover:bg-[--muted] transition-colors"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>

      <p className="text-xs text-[--muted-foreground]">
        Fügen Sie diesen Code auf Ihrer Website ein, um Ihre xcare-Bewertungen anzuzeigen.
      </p>
    </div>
  );
}
