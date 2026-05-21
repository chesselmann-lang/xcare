"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeOption = "light" | "dark" | "system";

const OPTIONS: { value: ThemeOption; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Hell", Icon: Sun },
  { value: "dark", label: "Dunkel", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle — three-way segmented control: Hell / Dunkel / System.
 *
 * Requires ThemeProvider to be present in the component tree (root layout).
 * Avoids hydration mismatch by deferring render until mounted.
 *
 * @example
 * <ThemeToggle className="mt-4" />
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — theme is unknown on the server
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex rounded-lg border border-[--border] bg-[--muted]/40 p-0.5 h-9",
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="Farbschema wählen"
      className={cn(
        "inline-flex rounded-lg border border-[--border] bg-[--muted]/40 p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={label}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all",
            theme === value
              ? "bg-[--background] text-[--foreground] shadow-sm"
              : "text-[--muted-foreground] hover:text-[--foreground]"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
