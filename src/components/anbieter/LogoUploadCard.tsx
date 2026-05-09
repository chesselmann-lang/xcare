"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Check, Loader2, ImagePlus, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface LogoUploadCardProps {
  anbieterId: string;
  anbieterName: string;
  initialLogoUrl: string | null;
}

const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function LogoUploadCard({ anbieterId, anbieterName, initialLogoUrl }: LogoUploadCardProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ACCEPTED.includes(f.type)) {
      toast.error("Nur JPEG, PNG, WebP oder GIF erlaubt.");
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      toast.error(`Datei zu groß. Maximum: ${MAX_SIZE_MB} MB.`);
      return;
    }

    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleDiscard() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `logos/${anbieterId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("anbieter-dokumente")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("anbieter-dokumente")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("anbieter")
        .update({ logo_url: publicUrl })
        .eq("id", anbieterId);

      if (dbErr) throw dbErr;

      setLogoUrl(publicUrl);
      handleDiscard();
      toast.success("Logo erfolgreich gespeichert.");
    } catch (err) {
      console.error(err);
      toast.error("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!logoUrl) return;
    setUploading(true);
    try {
      const supabase = createClient();
      await supabase.from("anbieter").update({ logo_url: null }).eq("id", anbieterId);
      setLogoUrl(null);
      toast.success("Logo entfernt.");
    } catch {
      toast.error("Fehler beim Entfernen.");
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview ?? logoUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-[--primary]" /> Einrichtungs-Logo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Preview / current logo */}
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-xl border-2 border-dashed border-[--border] bg-[--muted]/30 flex items-center justify-center overflow-hidden">
              {displayUrl ? (
                <Image
                  src={displayUrl}
                  alt={`Logo ${anbieterName}`}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  unoptimized={!!preview} // skip Next.js optimization for blob URLs
                />
              ) : (
                <span className="text-3xl font-bold text-[--primary] select-none">
                  {anbieterName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {preview && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-white">
                <Info className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3">
            {preview ? (
              /* New file selected — show upload / discard */
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Vorschau — noch nicht gespeichert
                </p>
                <p className="text-xs text-[--muted-foreground]">{file?.name}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpload} disabled={uploading} className="gap-1.5">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Logo speichern
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDiscard} disabled={uploading}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Verwerfen
                  </Button>
                </div>
              </div>
            ) : (
              /* No pending file */
              <div className="space-y-2">
                <div>
                  <label
                    htmlFor="logo-input"
                    className="inline-flex items-center gap-1.5 cursor-pointer text-sm font-medium text-[--primary] hover:underline"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {logoUrl ? "Logo ändern" : "Logo hochladen"}
                  </label>
                  <input
                    ref={inputRef}
                    id="logo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={uploading}
                    className="text-xs text-[--muted-foreground] hover:text-red-600 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Logo entfernen
                  </button>
                )}
              </div>
            )}

            {/* Hints */}
            <div className="rounded-lg bg-[--muted]/40 px-3 py-2 space-y-1">
              <p className="text-xs text-[--muted-foreground] font-medium">Empfehlungen</p>
              <ul className="text-xs text-[--muted-foreground] space-y-0.5 list-disc list-inside">
                <li>Quadratisches Bild (1:1) für beste Darstellung</li>
                <li>Mindestens 400 × 400 px</li>
                <li>Format: JPG, PNG oder WebP · max. {MAX_SIZE_MB} MB</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
