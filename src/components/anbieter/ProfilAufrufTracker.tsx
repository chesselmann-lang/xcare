"use client";

import { useEffect, useRef } from "react";

interface ProfilAufrufTrackerProps {
  anbieterId: string;
}

/**
 * Silent client component that fires a single POST on mount to record
 * a profile view. Rendered only for non-anbieter visitors.
 */
export function ProfilAufrufTracker({ anbieterId }: ProfilAufrufTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/profil-aufruf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anbieterId }),
    }).catch(() => {
      // silently ignore — tracking failure must never affect UX
    });
  }, [anbieterId]);

  return null;
}
