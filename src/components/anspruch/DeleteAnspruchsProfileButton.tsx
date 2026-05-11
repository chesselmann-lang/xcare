"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteAnspruchsProfileButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Gespeicherte Berechnung löschen?")) return;
    setLoading(true);
    try {
      await fetch(`/api/anspruch/save?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
      title="Löschen"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
