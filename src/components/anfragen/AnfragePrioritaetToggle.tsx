"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";

const STORAGE_KEY = "xcare_anfragen_wichtig";

function loadWichtig(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveWichtig(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

interface Props {
  anfrageId: string;
}

export function AnfragePrioritaetToggle({ anfrageId }: Props) {
  const [wichtig, setWichtig] = useState(false);

  useEffect(() => {
    setWichtig(loadWichtig().has(anfrageId));
  }, [anfrageId]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWichtig((prev) => {
      const ids = loadWichtig();
      if (prev) {
        ids.delete(anfrageId);
      } else {
        ids.add(anfrageId);
      }
      saveWichtig(ids);
      return !prev;
    });
  }, [anfrageId]);

  return (
    <button
      onClick={toggle}
      title={wichtig ? "Als nicht wichtig markieren" : "Als wichtig markieren"}
      aria-label={wichtig ? "Wichtig-Markierung entfernen" : "Als wichtig markieren"}
      className={`p-1 rounded-md transition-colors shrink-0 ${
        wichtig
          ? "text-amber-400 hover:text-amber-500"
          : "text-gray-300 hover:text-amber-300"
      }`}
    >
      <Star className={`h-4 w-4 ${wichtig ? "fill-amber-400" : ""}`} />
    </button>
  );
}

/** Hook to read the current set of wichtig IDs — for sorting/filtering in the list */
export function useWichtigIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIds(loadWichtig());
    // Listen for storage events from other tabs
    const handler = () => setIds(loadWichtig());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return ids;
}
