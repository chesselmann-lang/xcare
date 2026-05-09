"use client";

import { useEffect, useRef } from "react";

/**
 * Silently tracks that the current (Familie) user has viewed this Anbieter profile.
 * Fire-once per component mount. Swallows all errors.
 */
export function ZuletztAngesehenTracker({ anbieterId }: { anbieterId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/zuletzt-angesehen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anbieterId }),
    }).catch(() => {});
  }, [anbieterId]);

  return null;
}
