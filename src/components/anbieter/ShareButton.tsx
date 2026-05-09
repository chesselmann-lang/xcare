"use client";

import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  anbieterId: string;
  anbieterName: string;
}

export function ShareButton({ anbieterId, anbieterName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";
  const url = `${appUrl}/anbieter/${anbieterId}`;
  const text = `${anbieterName} auf xcare – Ihr digitales Pflege-Ökosystem`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link kopiert!");
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank");
    setOpen(false);
  };

  const shareEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`Ich möchte Ihnen diesen Anbieter empfehlen:\n\n${url}`)}`;
    setOpen(false);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: anbieterName, text, url });
      } catch {
        // cancelled
      }
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (navigator.share) { nativeShare(); } else { setOpen((o) => !o); }
        }}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Teilen
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-[--card] border border-[--border] rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={copy}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-[--muted] transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              Link kopieren
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-[--muted] transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              WhatsApp
            </button>
            <button
              onClick={shareEmail}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-[--muted] transition-colors"
            >
              <Mail className="h-4 w-4 text-blue-600" />
              Per E-Mail
            </button>
          </div>
        </>
      )}
    </div>
  );
}
