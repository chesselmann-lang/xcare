"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kontaktNachrichtSenden } from "@/app/(public)/anbieter/[id]/aktionen";

interface KontaktFormularProps {
  anbieterId: string;
  anbieterName: string;
}

export function KontaktFormular({ anbieterId, anbieterName }: KontaktFormularProps) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    telefon: "",
    nachricht: "",
    // Honeypot field — must stay empty; bots fill it, humans don't see it (S278)
    website: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Honeypot check (S278) — if bot filled the hidden field, silently pretend success
    if (form.website) {
      setSuccess(true);
      return;
    }
    startTransition(async () => {
      const result = await kontaktNachrichtSenden(anbieterId, {
        name: form.name,
        email: form.email,
        telefon: form.telefon || undefined,
        nachricht: form.nachricht,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[--foreground]">Nachricht gesendet!</p>
          <p className="text-xs text-[--muted-foreground] mt-1">
            {anbieterName} wurde benachrichtigt und meldet sich bei Ihnen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-[--foreground] mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="Ihr vollständiger Name"
          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[--foreground] mb-1">
          E-Mail <span className="text-red-500">*</span>
        </label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="ihre@email.de"
          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[--foreground] mb-1">
          Telefon <span className="text-xs font-normal text-[--muted-foreground]">(optional)</span>
        </label>
        <input
          name="telefon"
          type="tel"
          value={form.telefon}
          onChange={handleChange}
          placeholder="+49 ..."
          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[--foreground] mb-1">
          Ihre Nachricht <span className="text-red-500">*</span>
        </label>
        <textarea
          name="nachricht"
          value={form.nachricht}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Schildern Sie kurz Ihr Anliegen …"
          className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm placeholder-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30 resize-none"
        />
        <p className="text-[10px] text-[--muted-foreground] mt-0.5">
          Mindestens 20 Zeichen ({form.nachricht.length}/20)
        </p>
      </div>

      {/* Honeypot field — visually hidden, intentionally not labeled (S278) */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      >
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Nachricht senden
      </Button>

      <p className="text-[10px] text-[--muted-foreground] text-center leading-relaxed">
        Ihre Angaben werden vertraulich behandelt und nur an {anbieterName} weitergeleitet.
        Es gilt unsere{" "}
        <a href="/datenschutz" className="underline hover:text-[--foreground]">Datenschutzerklärung</a>.
      </p>
    </form>
  );
}
