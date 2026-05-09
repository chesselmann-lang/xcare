"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface FavoritButtonProps {
  anbieterId: string;
  istFavorit: boolean;
  profileId: string;
  size?: "sm" | "default";
  className?: string;
}

export function FavoritButton({
  anbieterId,
  istFavorit: initialFavorit,
  profileId,
  size = "default",
  className,
}: FavoritButtonProps) {
  const [isFavorit, setIsFavorit] = useState(initialFavorit);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    // Optimistic update
    setIsFavorit((prev) => !prev);
    setLoading(true);

    try {
      if (isFavorit) {
        await supabase
          .from("favoriten")
          .delete()
          .eq("familie_id", profileId)
          .eq("anbieter_id", anbieterId);
        toast("Aus Favoriten entfernt", { icon: "🗑️" });
      } else {
        await supabase.from("favoriten").insert({
          familie_id: profileId,
          anbieter_id: anbieterId,
        });
        toast.success("Zu Favoriten hinzugefügt", { description: "Sie finden diesen Anbieter unter Favoriten." });
      }
    } catch {
      // Rollback on error
      setIsFavorit((prev) => !prev);
      toast.error("Fehler", { description: "Aktion konnte nicht gespeichert werden." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggle}
      disabled={loading}
      className={`gap-1.5 transition-all ${isFavorit ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100" : ""} ${className ?? ""}`}
      title={isFavorit ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
    >
      <Heart
        className={`h-4 w-4 transition-all ${isFavorit ? "fill-rose-500 text-rose-500 scale-110" : ""}`}
      />
      {isFavorit ? "Gespeichert" : "Speichern"}
    </Button>
  );
}
