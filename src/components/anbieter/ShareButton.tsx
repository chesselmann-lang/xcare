"use client";

/**
 * ShareButton — S329
 *
 * Teilt die öffentliche Anbieter-Profilseite via Web Share API.
 * Fallback: URL in Zwischenablage kopieren.
 */

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  anbieterId: string;
  anbieterName: string;
}

export function ShareButton({ anbieterId, anbieterName }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/anbieter/${anbieterId}`;

    const shareData: ShareData = {
      title: anbieterName,
      text: `${anbieterName} auf xcare – Ihr Pflege- und Betreuungsanbieter`,
      url: profileUrl,
    };

    // Web Share API (mobile / modern browsers)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled → swallow silently
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profil-Link kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Link konnte nicht kopiert werden.");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-2"
      aria-label="Anbieter-Profil teilen"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline">Kopiert!</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Teilen</span>
        </>
      )}
    </Button>
  );
}
