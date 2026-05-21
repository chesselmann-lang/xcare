"use client";

import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";

interface ProfileQrCodeProps {
  /** The public URL that the QR code should encode */
  url: string;
  /** Display label below the QR code (e.g. anbieter name) */
  label?: string;
  /** Size in pixels (default 200) */
  size?: number;
}

/**
 * ProfileQrCode — renders a QR code for the given URL using the
 * qrserver.com free API. No npm dependency required.
 *
 * @example
 * <ProfileQrCode
 *   url={`https://xcare.de/anbieter/${anbieter.id}`}
 *   label={anbieter.name}
 * />
 */
export function ProfileQrCode({ url, label, size = 200 }: ProfileQrCodeProps) {
  const [copied, setCopied] = useState(false);

  const qrSrc =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=${size}x${size}&format=png&color=0f1923&bgcolor=ffffff&data=${encodeURIComponent(url)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = "qr-code-profil.png";
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QR Image */}
      <div className="rounded-xl border border-[--border] bg-white p-3 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR-Code für ${label ?? url}`}
          width={size}
          height={size}
          className="block"
          loading="lazy"
        />
      </div>

      {/* URL display */}
      <p
        className="text-xs text-[--muted-foreground] text-center break-all max-w-xs"
        title={url}
      >
        {url}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm font-medium text-[--foreground] hover:bg-[--muted]/40 transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Kopiert" : "Link kopieren"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm font-medium text-[--foreground] hover:bg-[--muted]/40 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          QR speichern
        </button>
      </div>
    </div>
  );
}
