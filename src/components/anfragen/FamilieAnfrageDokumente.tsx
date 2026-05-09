"use client";

import { useState, useRef, useCallback } from "react";
import { Paperclip, Upload, Trash2, FileText, FileImage, File, Loader2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  anfrageId: string;
  familieId: string;
  initialDokumente: Dokument[];
}

const BUCKET = "anfrage-dokumente";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.txt";

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

export function FamilieAnfrageDokumente({ anfrageId, familieId, initialDokumente }: Props) {
  const [dokumente, setDokumente] = useState<Dokument[]>(initialDokumente);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const uploadFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Dateityp nicht unterstützt", {
        description: "Erlaubt sind: PDF, Bilder, Word-Dokumente, Textdateien.",
      });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Datei zu groß", { description: "Maximale Dateigröße: 10 MB." });
      return;
    }

    setUploading(true);
    try {
      // Build storage path: anfrageId/familieId/timestamp-filename
      const ext = file.name.split(".").pop() ?? "";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePfad = `${anfrageId}/${familieId}/${Date.now()}-${safeName}`;

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePfad, file, { contentType: file.type, upsert: false });

      if (storageError) {
        // Bucket may not exist yet in dev — surface the error clearly
        throw storageError;
      }

      // Insert DB row
      const { data: row, error: dbError } = await supabase
        .from("anfrage_dokumente")
        .insert({
          anfrage_id: anfrageId,
          familie_id: familieId,
          dateiname: file.name,
          storage_pfad: storagePfad,
          mime_typ: file.type,
          groesse_bytes: file.size,
        })
        .select("id, dateiname, storage_pfad, mime_typ, groesse_bytes, created_at")
        .single();

      if (dbError) throw dbError;

      setDokumente((prev) => [row, ...prev]);
      toast.success("Dokument hochgeladen", { description: file.name });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Upload fehlgeschlagen", { description: msg });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [anfrageId, familieId, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (dok: Dokument) => {
    setDeleting(dok.id);
    try {
      // Remove from storage
      await supabase.storage.from(BUCKET).remove([dok.storage_pfad]);

      // Remove from DB
      const { error } = await supabase
        .from("anfrage_dokumente")
        .delete()
        .eq("id", dok.id);

      if (error) throw error;

      setDokumente((prev) => prev.filter((d) => d.id !== dok.id));
      toast.success("Dokument gelöscht");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Löschen";
      toast.error("Löschen fehlgeschlagen", { description: msg });
    } finally {
      setDeleting(null);
    }
  };

  const getDownloadUrl = async (storagePfad: string) => {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePfad, 60); // 60-second signed URL
    return data?.signedUrl ?? null;
  };

  const handleDownload = async (dok: Dokument) => {
    const url = await getDownloadUrl(dok.storage_pfad);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = dok.dateiname;
      a.click();
    } else {
      toast.error("Download nicht verfügbar");
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone / upload button */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer
          ${dragOver
            ? "border-[--primary] bg-[--primary]/5"
            : "border-[--border] hover:border-[--primary]/50 hover:bg-[--muted]/40"}
        `}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="Dokument hochladen"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-7 w-7 animate-spin text-[--primary]" />
            <p className="text-sm text-[--muted-foreground]">Wird hochgeladen…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <Upload className="h-7 w-7 text-[--muted-foreground]" />
            <p className="text-sm font-medium text-[--foreground]">
              Datei hierher ziehen oder klicken
            </p>
            <p className="text-xs text-[--muted-foreground]">
              PDF, Bilder, Word • max. 10 MB
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {dokumente.length > 0 && (
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
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(dok)}
                  title="Herunterladen"
                  className="p-1.5 rounded-md hover:bg-[--muted] text-[--muted-foreground] hover:text-[--foreground] transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(dok)}
                  disabled={deleting === dok.id}
                  title="Löschen"
                  className="p-1.5 rounded-md hover:bg-red-50 text-[--muted-foreground] hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting === dok.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dokumente.length === 0 && !uploading && (
        <p className="text-xs text-center text-[--muted-foreground] py-1">
          Noch keine Dokumente hochgeladen.
        </p>
      )}
    </div>
  );
}
