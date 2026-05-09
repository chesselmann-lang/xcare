"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, Trash2, Loader2, GripVertical, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type GalerieBild = {
  id: string;
  storage_pfad: string;
  alt_text: string | null;
  position: number;
};

interface Props {
  anbieterId: string;
  initialBilder: GalerieBild[];
}

const BUCKET = "anbieter-galerie";
const MAX_BILDER = 8;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

function getPublicUrl(supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>, pfad: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pfad);
  return data.publicUrl;
}

export function GalerieUpload({ anbieterId, initialBilder }: Props) {
  const [bilder, setBilder] = useState<GalerieBild[]>(
    [...initialBilder].sort((a, b) => a.position - b.position)
  );
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const uploadFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Dateityp nicht unterstützt", { description: "Erlaubt sind: JPEG, PNG, WebP." });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Datei zu groß", { description: "Maximale Dateigröße: 5 MB." });
      return;
    }
    if (bilder.length >= MAX_BILDER) {
      toast.error(`Maximal ${MAX_BILDER} Bilder erlaubt`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePfad = `${anbieterId}/${Date.now()}-${safeName}`;

      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePfad, file, { contentType: file.type, upsert: false });

      if (storageError) throw storageError;

      const nextPosition = bilder.length > 0 ? Math.max(...bilder.map((b) => b.position)) + 1 : 0;

      const { data: row, error: dbError } = await supabase
        .from("anbieter_galerie")
        .insert({
          anbieter_id: anbieterId,
          storage_pfad: storagePfad,
          position: nextPosition,
        })
        .select("id, storage_pfad, alt_text, position")
        .single();

      if (dbError) throw dbError;

      setBilder((prev) => [...prev, row]);
      toast.success("Bild hochgeladen");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Upload fehlgeschlagen", { description: msg });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [anbieterId, bilder, supabase]);

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

  const handleDelete = async (bild: GalerieBild) => {
    setDeleting(bild.id);
    try {
      await supabase.storage.from(BUCKET).remove([bild.storage_pfad]);
      const { error } = await supabase.from("anbieter_galerie").delete().eq("id", bild.id);
      if (error) throw error;
      setBilder((prev) => prev.filter((b) => b.id !== bild.id));
      toast.success("Bild gelöscht");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Löschen";
      toast.error("Löschen fehlgeschlagen", { description: msg });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[--muted-foreground]">
          {bilder.length} / {MAX_BILDER} Bilder · JPEG, PNG, WebP · max. 5 MB
        </p>
        {bilder.length < MAX_BILDER && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            Bild hinzufügen
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {/* Bild-Raster */}
      {bilder.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {bilder.map((bild) => (
            <div key={bild.id} className="relative group aspect-square rounded-xl overflow-hidden border border-[--border] bg-[--muted]">
              <Image
                src={getPublicUrl(supabase, bild.storage_pfad)}
                alt={bild.alt_text ?? "Galerie-Bild"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover"
              />
              {/* Delete overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleDelete(bild)}
                  disabled={deleting === bild.id}
                  className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  title="Bild löschen"
                >
                  {deleting === bild.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
              {/* Position badge */}
              <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-xs rounded px-1.5 py-0.5">
                {bild.position + 1}
              </div>
            </div>
          ))}

          {/* Drop zone tile (if space remains) */}
          {bilder.length < MAX_BILDER && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              className={`
                aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all
                ${dragOver
                  ? "border-[--primary] bg-[--primary]/5"
                  : "border-[--border] hover:border-[--primary]/50 hover:bg-[--muted]/60"}
              `}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-[--primary]" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-[--muted-foreground]" />
                  <span className="text-xs text-[--muted-foreground] text-center px-2">
                    Bild hinzufügen
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty state: large drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragOver
              ? "border-[--primary] bg-[--primary]/5"
              : "border-[--border] hover:border-[--primary]/50 hover:bg-[--muted]/40"}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[--primary]" />
              <p className="text-sm text-[--muted-foreground]">Wird hochgeladen…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-[--muted-foreground]" />
              <p className="font-medium text-sm">Fotos hierher ziehen oder klicken</p>
              <p className="text-xs text-[--muted-foreground]">
                Bis zu {MAX_BILDER} Bilder · JPEG, PNG, WebP · max. 5 MB pro Bild
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-[--muted-foreground]">
        Bilder werden auf Ihrem öffentlichen Profil in der Reihenfolge angezeigt, in der sie hochgeladen wurden.
      </p>
    </div>
  );
}
