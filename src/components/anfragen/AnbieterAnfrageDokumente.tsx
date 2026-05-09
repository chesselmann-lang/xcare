"use client";

import { useState } from "react";
import { FileText, FileImage, File, Download, Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Dokument = {
  id: string;
  dateiname: string;
  storage_pfad: string;
  mime_typ: string;
  groesse_bytes: number;
  created_at: string;
};

interface Props {
  dokumente: Dokument[];
}

const BUCKET = "anfrage-dokumente";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4 text-gray-400" />;
}

/**
 * Read-only document list for Anbieter — they can view and download documents
 * that families have uploaded to an Anfrage, but cannot delete or upload.
 */
export function AnbieterAnfrageDokumente({ dokumente }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const supabase = createClient();

  const handleDownload = async (dok: Dokument) => {
    setDownloading(dok.id);
    try {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(dok.storage_pfad, 60);

      if (data?.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = dok.dateiname;
        a.click();
      } else {
        toast.error("Download nicht verfügbar");
      }
    } catch {
      toast.error("Download fehlgeschlagen");
    } finally {
      setDownloading(null);
    }
  };

  if (dokumente.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[--muted-foreground] py-2">
        <Paperclip className="h-4 w-4 shrink-0" />
        <span>Die Familie hat keine Dokumente angehängt.</span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {dokumente.map((dok) => (
        <li
          key={dok.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[--border] bg-[--card] group"
        >
          <FileIcon mimeType={dok.mime_typ} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{dok.dateiname}</p>
            <p className="text-xs text-[--muted-foreground]">{formatBytes(dok.groesse_bytes)}</p>
          </div>
          <button
            onClick={() => handleDownload(dok)}
            disabled={downloading === dok.id}
            title="Herunterladen"
            className="p-1.5 rounded-md hover:bg-[--muted] text-[--muted-foreground] hover:text-[--foreground] transition-colors disabled:opacity-50 shrink-0 opacity-0 group-hover:opacity-100"
          >
            {downloading === dok.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
