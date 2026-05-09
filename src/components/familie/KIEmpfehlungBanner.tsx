"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface KIEmpfehlungBannerProps {
  lebenslage: string | null;
  plz: string | null;
  ort: string | null;
  offeneAnfragen: number;
  empfohleneAnbieterNamen: string[];
}

/**
 * Fetches a personalized AI recommendation text from /api/ki-empfehlung
 * and renders it as a subtle banner. Gracefully hides if the API is slow/unavailable.
 */
export function KIEmpfehlungBanner({
  lebenslage,
  plz,
  ort,
  offeneAnfragen,
  empfohleneAnbieterNamen,
}: KIEmpfehlungBannerProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false); // give up after 8s
    }, 8000);

    fetch("/api/ki-empfehlung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lebenslage, plz, ort, offeneAnfragen, empfohleneAnbieterNamen }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.text) {
          setText(data.text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't render anything while loading or if AI returned nothing
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 animate-pulse mb-4">
        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
        <div className="h-3 rounded bg-indigo-100 w-3/4" />
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 mb-4">
      <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
      <p className="text-sm text-indigo-800 leading-relaxed">{text}</p>
    </div>
  );
}
