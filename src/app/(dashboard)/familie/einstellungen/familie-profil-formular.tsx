"use client";

import { useState, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Mail, Camera, User } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import type { Profile } from "@/lib/types";

interface Props {
  profile: Profile;
  email: string;
}

export function FamilieProfilFormular({ profile, email }: Props) {
  const [vorname, setVorname] = useState(profile.vorname ?? "");
  const [nachname, setNachname] = useState(profile.nachname ?? "");
  const [telefon, setTelefon] = useState((profile as { telefon?: string | null }).telefon ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const initials = [profile.vorname, profile.nachname]
    .filter(Boolean)
    .map((n) => n!.charAt(0).toUpperCase())
    .join("") || "?";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Bild ist zu groß (max. 2 MB).");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Nur JPG, PNG und WebP erlaubt.");
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Append cache-buster so the browser reloads
      const urlWithTs = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithTs);
      toast.success("Profilbild gespeichert.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Fehler beim Hochladen: " + msg);
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleSave() {
    if (!vorname.trim()) {
      toast.error("Bitte geben Sie Ihren Vornamen ein.");
      return;
    }
    startTransition(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          vorname: vorname.trim(),
          nachname: nachname.trim() || null,
          telefon: telefon.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        toast.error("Fehler beim Speichern: " + error.message);
        return;
      }
      toast.success("Profil erfolgreich gespeichert.");
    });
  }

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-[--primary-light] flex items-center justify-center ring-2 ring-[--border]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profilbild"
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[--primary] font-bold text-xl">
                {initials !== "?" ? initials : <User className="h-7 w-7" />}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[--primary] text-white flex items-center justify-center shadow hover:bg-[--primary]/90 transition-colors disabled:opacity-50"
            aria-label="Profilbild ändern"
          >
            {avatarUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-[--foreground]">Profilbild</p>
          <p className="text-xs text-[--muted-foreground]">JPG, PNG oder WebP · max. 2 MB</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="text-xs text-[--primary] hover:underline mt-0.5 disabled:opacity-50"
          >
            {avatarUploading ? "Wird hochgeladen…" : "Bild ändern"}
          </button>
        </div>
      </div>

      <Separator />

      {/* E-Mail (read-only) */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-700">E-Mail-Adresse</Label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-500">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {email}
        </div>
        <p className="text-xs text-gray-400">Die E-Mail-Adresse kann nicht geändert werden.</p>
      </div>

      <Separator />

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="vorname" className="text-xs font-medium text-gray-700">
            Vorname <span className="text-red-500">*</span>
          </Label>
          <Input
            id="vorname"
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
            placeholder="Max"
            className="text-sm"
            maxLength={50}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nachname" className="text-xs font-medium text-gray-700">
            Nachname
          </Label>
          <Input
            id="nachname"
            value={nachname}
            onChange={(e) => setNachname(e.target.value)}
            placeholder="Mustermann"
            className="text-sm"
            maxLength={50}
          />
        </div>
      </div>

      {/* Telefon */}
      <div className="space-y-1">
        <Label htmlFor="telefon" className="text-xs font-medium text-gray-700">
          Telefon (optional)
        </Label>
        <Input
          id="telefon"
          type="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="+49 123 456789"
          className="text-sm"
          maxLength={30}
        />
        <p className="text-xs text-gray-400">
          Wird nicht öffentlich angezeigt. Dient nur für die direkte Kontaktaufnahme durch Anbieter.
        </p>
      </div>

      <div className="pt-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  );
}
