"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquarePlus, Phone, Shield } from "lucide-react";
import { AnfrageDialog } from "@/components/anfrage/AnfrageDialog";
import { Button } from "@/components/ui/button";

interface Props {
  anbieterId: string;
  anbieterName: string;
  telefon?: string | null;
  isFamily: boolean;
}

/**
 * Sticky bottom CTA bar — visible only on mobile (hidden on lg+).
 * Automatically hides when the user scrolls far enough down to see the
 * sidebar contact card (sentinel div approach).
 */
export function StickyMobileCTA({ anbieterId, anbieterName, telefon, isFamily }: Props) {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reveal bar after a short scroll; hide once the sidebar is in view (sentinel)
  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Intersection observer to hide when sidebar CTA enters viewport (lg screens
  // never see the bar anyway due to CSS, but this prevents it flashing on tablets)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(false); },
      { threshold: 0.5 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel placed next to the sidebar card so we know when it's visible */}
      <div ref={sentinelRef} className="pointer-events-none" aria-hidden />

      {/* The actual sticky bar */}
      <div
        className={`
          fixed bottom-0 inset-x-0 z-40 lg:hidden
          bg-[--background]/95 backdrop-blur-sm border-t border-[--border] shadow-lg
          transform transition-transform duration-300
          ${visible ? "translate-y-0" : "translate-y-full"}
        `}
        aria-label="Schnellkontakt"
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {/* Phone (if available) */}
          {telefon && (
            <a href={`tel:${telefon}`} className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Phone className="h-3.5 w-3.5" />
                Anrufen
              </Button>
            </a>
          )}

          {/* Primary CTA */}
          <div className="flex-1">
            {isFamily ? (
              <AnfrageDialog
                anbieterId={anbieterId}
                anbieterName={anbieterName}
                trigger={
                  <Button className="w-full gap-2 text-sm font-semibold">
                    <MessageSquarePlus className="h-4 w-4" />
                    Anfrage stellen
                  </Button>
                }
              />
            ) : (
              <a href="#kontaktformular" className="block">
                <Button className="w-full gap-2 text-sm font-semibold">
                  <MessageSquarePlus className="h-4 w-4" />
                  Kontakt aufnehmen
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Trust signal */}
        <div className="flex justify-center pb-2">
          <p className="flex items-center gap-1 text-[10px] text-[--muted-foreground]">
            <Shield className="h-3 w-3 text-green-500" />
            Kostenlos &amp; unverbindlich
          </p>
        </div>
      </div>

      {/* Bottom spacing so content isn't hidden by bar on mobile */}
      <div className="h-20 lg:hidden" aria-hidden />
    </>
  );
}
