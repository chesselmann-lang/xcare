import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelative(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  if (days < 7) return `Vor ${days} Tagen`;
  return formatDate(date);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) =>
      ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c] ?? c
    )
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "…";
}
