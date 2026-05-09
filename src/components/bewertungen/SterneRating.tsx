"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface SterneRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" };

export function SterneRating({ value, onChange, readonly = false, size = "md" }: SterneRatingProps) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const cls = sizes[size];

  return (
    <div
      className={`flex gap-0.5 ${readonly ? "" : "cursor-pointer"}`}
      onMouseLeave={() => !readonly && setHovered(0)}
      role={readonly ? undefined : "radiogroup"}
      aria-label="Bewertung"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${cls} transition-all ${
            star <= active
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-gray-300"
          } ${!readonly ? "hover:scale-110" : ""}`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onClick={() => !readonly && onChange?.(star)}
          role={readonly ? undefined : "radio"}
          aria-checked={value === star}
          aria-label={`${star} Stern${star > 1 ? "e" : ""}`}
        />
      ))}
    </div>
  );
}

export function SterneDisplay({
  average,
  count,
  size = "sm",
}: {
  average: number;
  count: number;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <SterneRating value={Math.round(average)} readonly size={size} />
      <span className="text-sm font-semibold text-gray-700">{average.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count})</span>
    </div>
  );
}
