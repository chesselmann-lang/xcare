"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, Download, ShieldCheck, Globe, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface Dokument {
  id: string;
  name: string;
  path: string;
  size: number;
  typ: string;
  created_at: string;
  oeffentlich?: boolean;
  url?: string;
}

interface Props {
  anbieterId: string;
  initialDokumente?: Dokument[];
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_SIZE_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(typ: string) {
  if (typ === "application/pdf") return "📄";
  if (typ.startsWith("image/")) return "🖼️";
  return "📎";
}

export function DokumentUpload({ anbieterId, initialDokumente = [] }: Props) {
  const [dokumente, setDokumente] = useState<Dokument[]>(initialDokumente);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const uploadFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Ungültiges Dateiformat", {
        description: "Erlaubt: PDF, PNG, JPEG, WebP",
      });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Datei zu groß (max. ${MAX_SIZE_MB} MB)`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${anbieterId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("dokumente")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      // Save metadata to DB
      const { data, error: dbError } = await supabase
        .from("anbieter_dokumente")
        .insert({
          anbieter_id: anbieterId,
          name: file.name,
          path,
          size: file.size,
          typ: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Get signed URL for display
      const { data: signedData } = await supabase.storage
        .from("dokumente")
        .createSignedUrl(path, 3600);

      setDokumente((prev) => [...prev, { ...data, url: signedData?.signedUrl }]);
      toast.success(`"${file.name}" hochgeladen`);
    } catch (err) {
      console.error(err);
      toast.error("Upload fehlgeschlagen", {
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    } finally {
      setUploading(false);
    }
  }, [anbieterId, supabase]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
  }

  async function handleDelete(dok: Dokument) {
    setDeleting(dok.id);
    try {
      const { error: storageError } = await supabase.storage
        .from("dokumente")
        .remove([dok.path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("anbieter_dokumente")
        .delete()
        .eq("id", dok.id);
      if (dbError) throw dbError;

      setDokumente((prev) => prev.filter((d) => d.id !== dok.id));
      toast.success(`"${dok.name}" gelöscht`);
    } catch (err) {
      toast.error("Löschen fehlgeschlagen");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleOeffentlich(dok: Dokument) {
    setToggling(dok.id);
    try {
      const next = !dok.oeffentlich;
      const { error } = await supabase
        .from("anbieter_dokumente")
        .update({ oeffentlich: next })
        .eq("id", dok.id);
      if (error) throw error;
      setDokumente((prev) =>
        prev.map((d) => (d.id === dok.id ? { ...d, oeffentlich: next } : d))
      );
      toast.success(
        next
          ? `"${dok.name}" ist jetzt öffentlich sichtbar`
          : `"${dok.name}" ist jetzt nur intern sichtbar`
      );
    } catch (err) {
      toast.error("Sichtbarkeit konnte nicht geändert werden");
    } finally {
      setToggling(null);
    }
  }

  async function handleDownload(dok: Dokument) {
    const { data } = await supabase.storage
      .from("dokumente")
      .createSignedUrl(dok.path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noreferrer");
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-[--primary] bg-[--primary]/5"
            : "border-[--border] hover:border-[--primary]/40 hover:bg-[--muted]/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        aria-label="Dokument hochladen"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
          aria-hidden="true"
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[--primary] mx-auto mb-3" />
        ) : (
          <Upload className="h-8 w-8 text-[--muted-foreground] mx-auto mb-3" />
        )}
        <p className="text-sm font-medium text-[--foreground] mb-1">
          {uploading ? "Wird hochgeladen…" : "Dokumente hierher ziehen oder klicken"}
        </p>
        <p className="text-xs text-[--muted-foreground]">
          PDF, PNG, JPEG, WebP · Max. {MAX_SIZE_MB} MB
        </p>
      </div>

      {/* Document list */}
      {dokumente.length > 0 && (
        <ul className="space-y-2" aria-label="Hochgeladene Dokumente">
          {dokumente.map((dok) => (
            <li
              key={dok.id}
              className="flex items-center gap-3 bg-[--card] border border-[--border] rounded-xl p-3"
            >
              <span className="text-xl shrink-0" aria-hidden="true">
                {getFileIcon(dok.typ)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[--foreground] truncate">{dok.name}</p>
                <p className="text-xs text-[--muted-foreground]">
                  {formatBytes(dok.size)} ·{" "}
                  {new Date(dok.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleOeffentlich(dok)}
                  disabled={toggling === dok.id}
                  title={dok.oeffentlich ? "Öffentlich – klicken zum Verbergen" : "Intern – klicken zum Veröffentlichen"}
                  aria-label={dok.oeffentlich ? `"${dok.name}" verbergen` : `"${dok.name}" öffentlich zeigen`}
                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                    dok.oeffentlich
                      ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      : "text-[--muted-foreground] hover:text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {toggling === dok.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : dok.oeffentlich ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDownload(dok)}
                  className="p-1.5 rounded-lg text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted] transition-colors"
                  aria-label={`"${dok.name}" herunterladen`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(dok)}
                  disabled={deleting === dok.id}
                  className="p-1.5 rounded-lg text-[--muted-foreground] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  aria-label={`"${dok.name}" löschen`}
                >
                  {deleting === dok.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dokumente.length === 0 && !uploading && (
        <div className="flex items-center gap-2 text-xs text-[--muted-foreground] bg-[--muted]/40 rounded-xl p-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[--primary]" />
          <p>Laden Sie Nachweise wie Qualitätszertifikate, Erlaubnisse oder Referenzen hoch. Per <Globe className="inline h-3 w-3 mx-0.5 text-emerald-600" />-Symbol können Sie einzelne Dokumente auf Ihrem öffentlichen Profil anzeigen lassen.</p>
        </div>
      )}
    </div>
  );
}
