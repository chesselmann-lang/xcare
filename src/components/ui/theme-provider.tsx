"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * ThemeProvider — wraps next-themes with class-based dark mode strategy.
 *
 * Usage: wrap `{children}` in the root layout with this provider.
 * The `attribute="class"` setting lets next-themes add/remove the `dark`
 * class on `<html>`, which pairs with the `.dark { … }` block in globals.css.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
