"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Building2, Package, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AutocompleteResult {
  type: "anbieter" | "leistung";
  id: string;
  label: string;
  sublabel: string;
  verifiziert: boolean;
  href: string;
}

interface Props {
  placeholder?: string;
  onSearch?: (q: string) => void;
  className?: string;
}

export function AutocompleteSearch({ placeholder = "Anbieter oder Leistung suchen…", onSearch, className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setSelected(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(v), 220);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, -1));
    } else if (e.key === "Enter") {
      if (selected >= 0 && results[selected]) {
        router.push(results[selected].href);
        setOpen(false);
      } else if (onSearch) {
        onSearch(query);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {loading ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground] animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" />
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[--input] bg-[--background] text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] focus:border-transparent transition"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
          />
        </div>
      </form>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 bg-[--card] border border-[--border] rounded-xl shadow-lg overflow-hidden"
          role="listbox"
        >
          {results.map((r, i) => (
            <Link
              key={`${r.type}-${r.id}`}
              href={r.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[--muted] transition-colors ${selected === i ? "bg-[--muted]" : ""}`}
              role="option"
              aria-selected={selected === i}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[--primary-light] text-[--primary]">
                {r.type === "anbieter" ? <Building2 className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{r.label}</span>
                  {r.verifiziert && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                </div>
                {r.sublabel && (
                  <span className="text-xs text-[--muted-foreground] truncate block">{r.sublabel}</span>
                )}
              </div>
              <span className="text-[10px] text-[--muted-foreground] shrink-0 capitalize">
                {r.type === "anbieter" ? "Anbieter" : "Leistung"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
