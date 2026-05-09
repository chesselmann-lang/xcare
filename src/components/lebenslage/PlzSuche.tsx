"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

interface Props {
  kategorie: string;
  label: string;
}

export function PlzSuche({ kategorie, label }: Props) {
  const [plz, setPlz] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("kategorie", kategorie);
    if (plz.trim()) params.set("plz", plz.trim());
    router.push(`/suche?${params.toString()}`);
  }

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 max-w-md">
      <p className="text-sm text-white/80 mb-2 font-medium">
        {label} in Ihrer Nähe finden
      </p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
          <Input
            value={plz}
            onChange={(e) => setPlz(e.target.value)}
            placeholder="PLZ eingeben"
            className="pl-9 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 h-9 text-sm"
            maxLength={5}
            pattern="\d{5}"
            inputMode="numeric"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="bg-white text-[--primary] hover:bg-gray-50 gap-1.5 h-9"
        >
          <Search className="h-3.5 w-3.5" />
          Suchen
        </Button>
      </form>
    </div>
  );
}
