"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";

interface Props {
  /** "icon" = just the checkmark (for cards); "badge" = green pill with text; "inline" = text + icon row */
  variant?: "icon" | "badge" | "inline";
  size?: "xs" | "sm" | "md";
}

const TOOLTIP_TEXT =
  "Von xcare geprüft – wir haben Angaben, behördliche Zulassungen und Qualitätsnachweise dieses Anbieters überprüft.";

export function VerifizierungsBadge({ variant = "badge", size = "sm" }: Props) {
  /* ── Icon-only variant (e.g. directory grid cards) ── */
  if (variant === "icon") {
    const iconSize = size === "xs" ? "h-3.5 w-3.5" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
    return (
      <span className="relative group/vbadge inline-flex items-center">
        <CheckCircle2
          className={`${iconSize} text-green-500 shrink-0 cursor-help`}
          aria-label="Verifizierter Anbieter"
        />
        {/* Tooltip */}
        <span
          role="tooltip"
          className={`
            pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            w-56 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 shadow-md
            opacity-0 scale-95 group-hover/vbadge:opacity-100 group-hover/vbadge:scale-100
            transition-all duration-150 origin-bottom
          `}
        >
          <span className="flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600" />
            {TOOLTIP_TEXT}
          </span>
          {/* Arrow */}
          <span className="absolute left-1/2 -translate-x-1/2 top-full h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-green-200" />
        </span>
      </span>
    );
  }

  /* ── Inline variant (e.g. detail page sidebar) ── */
  if (variant === "inline") {
    const iconSize = size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
    const textSize = size === "xs" ? "text-xs" : size === "sm" ? "text-xs" : "text-sm";
    return (
      <span className="relative group/vbadge inline-flex items-center gap-1.5 text-green-700 cursor-help">
        <CheckCircle2 className={`${iconSize} shrink-0`} />
        <span className={`${textSize} font-medium`}>Verifizierter Anbieter</span>
        {/* Tooltip */}
        <span
          role="tooltip"
          className={`
            pointer-events-none absolute z-50 bottom-full left-0 mb-2
            w-60 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 shadow-md
            opacity-0 scale-95 group-hover/vbadge:opacity-100 group-hover/vbadge:scale-100
            transition-all duration-150 origin-bottom-left
          `}
        >
          <span className="flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600" />
            {TOOLTIP_TEXT}
          </span>
          <span className="absolute left-3 top-full h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-green-200" />
        </span>
      </span>
    );
  }

  /* ── Badge variant (default, e.g. AnbieterKarte, detail page header) ── */
  const iconSize = size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const badgePadding = size === "xs" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const textSize = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <span className="relative group/vbadge inline-flex items-center cursor-help">
      <span
        className={`
          inline-flex items-center gap-1 ${badgePadding} rounded-full
          bg-green-100 text-green-700 border border-green-200 font-medium ${textSize}
          select-none
        `}
        aria-label="Verifizierter Anbieter – klicken für Details"
      >
        <CheckCircle2 className={`${iconSize} shrink-0`} />
        Verifiziert
      </span>

      {/* Tooltip */}
      <span
        role="tooltip"
        className={`
          pointer-events-none absolute z-50 bottom-full left-0 mb-2
          w-60 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 shadow-md
          opacity-0 scale-95 group-hover/vbadge:opacity-100 group-hover/vbadge:scale-100
          transition-all duration-150 origin-bottom-left
        `}
      >
        <span className="flex items-start gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600" />
          {TOOLTIP_TEXT}
        </span>
        <span className="absolute left-3 top-full h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-green-200" />
      </span>
    </span>
  );
}
