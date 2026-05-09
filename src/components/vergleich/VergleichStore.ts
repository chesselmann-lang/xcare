/**
 * Tiny localStorage-backed utility for managing the comparison selection.
 * Max 3 anbieter at once. Dispatches a custom event on changes so all
 * subscribers (VergleichBar, VergleichToggle) stay in sync.
 */

const KEY = "xcare_vergleich_ids";
const MAX = 3;
export const VERGLEICH_CHANGED = "xcare:vergleich_changed";

export interface VergleichEntry {
  id: string;
  name: string;
}

export function getVergleichIds(): VergleichEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VergleichEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: VergleichEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(VERGLEICH_CHANGED, { detail: entries }));
  } catch { /* ignore */ }
}

export function addToVergleich(entry: VergleichEntry): boolean {
  const current = getVergleichIds();
  if (current.length >= MAX) return false;
  if (current.some((e) => e.id === entry.id)) return true;
  save([...current, entry]);
  return true;
}

export function removeFromVergleich(id: string) {
  save(getVergleichIds().filter((e) => e.id !== id));
}

export function isInVergleich(id: string): boolean {
  return getVergleichIds().some((e) => e.id === id);
}

export function clearVergleich() {
  save([]);
}
