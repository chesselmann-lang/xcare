"use client";

import { useRouter } from "next/navigation";

interface Familie {
  id: string;
  vorname: string | null;
  nachname: string | null;
}

interface Props {
  familien: Familie[];
  selectedId?: string;
}

export function FamilienSelector({ familien, selectedId }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const url = new URL(window.location.href);
    if (val) {
      url.searchParams.set("familie", val);
    } else {
      url.searchParams.delete("familie");
    }
    router.push(url.pathname + url.search);
  }

  if (!familien.length) return null;

  return (
    <div className="flex gap-2 items-center">
      <label htmlFor="familie-select" className="text-sm text-[--muted-foreground]">
        Familie:
      </label>
      <select
        id="familie-select"
        defaultValue={selectedId ?? ""}
        onChange={handleChange}
        className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
      >
        <option value="">— auswählen</option>
        {familien.map((f) => (
          <option key={f.id} value={f.id}>
            {f.vorname} {f.nachname}
          </option>
        ))}
      </select>
    </div>
  );
}
