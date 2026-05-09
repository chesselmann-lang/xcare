"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface VerifizierungsButtonsProps {
  anbieterId: string;
  isVerifiziert: boolean;
  isAktiv: boolean;
}

export function VerifizierungsButtons({ anbieterId, isVerifiziert, isAktiv }: VerifizierungsButtonsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const toggleVerifiziert = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("anbieter")
      .update({ verifiziert: !isVerifiziert })
      .eq("id", anbieterId);

    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success(isVerifiziert ? "Verifizierung entfernt" : "Anbieter verifiziert!");
      router.refresh();
    }
    setLoading(false);
  };

  const toggleAktiv = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("anbieter")
      .update({ aktiv: !isAktiv })
      .eq("id", anbieterId);

    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success(isAktiv ? "Anbieter deaktiviert" : "Anbieter aktiviert");
      router.refresh();
    }
    setLoading(false);
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={toggleVerifiziert}
        title={isVerifiziert ? "Verifizierung entfernen" : "Verifizieren"}
        className={`p-1.5 rounded-lg transition-colors ${
          isVerifiziert
            ? "text-green-600 hover:bg-green-50"
            : "text-orange-500 hover:bg-orange-50"
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
      <button
        onClick={toggleAktiv}
        title={isAktiv ? "Deaktivieren" : "Aktivieren"}
        className={`p-1.5 rounded-lg transition-colors ${
          isAktiv
            ? "text-red-500 hover:bg-red-50"
            : "text-green-500 hover:bg-green-50"
        }`}
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}
