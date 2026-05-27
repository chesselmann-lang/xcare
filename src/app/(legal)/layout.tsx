import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Shared layout for legal pages (Impressum, AGB, Datenschutz).
 * Provides a minimal header with home link and a footer with cross-links.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[--background] text-[--foreground]">
      <header className="border-b border-[--border] px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-sm font-semibold text-[--primary] hover:underline">
            ← xcare
          </Link>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[--border] px-4 py-6 text-sm text-[--muted-foreground]">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-4">
          <Link href="/impressum" className="hover:text-[--foreground]">Impressum</Link>
          <Link href="/agb" className="hover:text-[--foreground]">AGB</Link>
          <Link href="/datenschutz" className="hover:text-[--foreground]">Datenschutz</Link>
        </div>
      </footer>
    </div>
  );
}
