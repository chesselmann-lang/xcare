"use client";

import { useEffect } from "react";

/** Auto-triggers window.print() after a short delay so the page renders first. */
export function DruckenTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
