"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface ImageUploadProps {
  bucket: string;
  path: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  shape?: "circle" | "square";
}

export function ImageUpload({
  bucket,
  path,
  currentUrl,
  onUpload,
  label = "Bild hochladen",
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMB = 2,
  shape = "square",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Bild zu groß (max. ${maxSizeMB} MB)`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${path}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

    if (error) {
      toast.error("Upload fehlgeschlagen", { description: error.message });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const urlWithCache = `${publicUrl}?t=${Date.now()}`;
    setPreview(urlWithCache);
    onUpload(publicUrl);
    toast.success("Bild hochgeladen!");
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const roundedCls = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div
        className={`relative group ${roundedCls} border-2 border-dashed border-[--border] overflow-hidden transition-colors hover:border-[--primary]/50 cursor-pointer`}
        style={{ width: shape === "circle" ? 96 : "100%", height: shape === "circle" ? 96 : 160 }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <>
            <Image src={preview} alt="Vorschau" fill className="object-cover" sizes="300px" />
            <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${roundedCls}`}>
              {uploading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Upload className="h-6 w-6 text-white" />
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[--muted-foreground]">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                {shape !== "circle" && (
                  <p className="text-xs text-center px-4">Klicken oder Bild hierher ziehen<br />(max. {maxSizeMB} MB)</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
