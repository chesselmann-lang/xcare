"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Users, Building2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { scorePassword } from "@/lib/password-strength";
import type { UserRole } from "@/lib/types";

const schema = z.object({
  rolle: z.enum(["familie", "anbieter"]),
  vorname: z.string().min(2, "Mindestens 2 Zeichen"),
  nachname: z.string().min(2, "Mindestens 2 Zeichen"),
  email: z.string().email("Gültige E-Mail erforderlich"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
  plz: z.string().regex(/^\d{5}$/, "5-stellige PLZ eingeben"),
});

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  // Honeypot — outside Zod schema; bots fill it, humans don't see it (S278)
  const [honeypot, setHoneypot] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rolle: "familie" },
  });

  const rolle = watch("rolle");
  const passwordValue = watch("password") ?? "";
  const strength = scorePassword(passwordValue);

  async function onSubmit(data: FormData) {
    setError(null);
    // Honeypot check (S278) — silently succeed if bot filled the hidden field
    if (honeypot) {
      setSuccess(true);
      return;
    }
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          vorname: data.vorname,
          nachname: data.nachname,
          rolle: data.rolle,
          plz: data.plz,
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl text-[--success]">Fast fertig! 🎉</CardTitle>
          <CardDescription>
            Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige deine Adresse, um fortzufahren.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Konto erstellen</CardTitle>
        <CardDescription>Wähle deine Rolle bei xcare</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Rollen-Auswahl */}
          <div className="grid grid-cols-2 gap-3">
            {(["familie", "anbieter"] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setValue("rolle", r as "familie" | "anbieter")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  rolle === r
                    ? "border-[--primary] bg-[--primary-light]"
                    : "border-[--border] hover:border-[--primary]/50"
                )}
              >
                {r === "familie" ? (
                  <Users className="h-7 w-7 text-[--primary]" />
                ) : (
                  <Building2 className="h-7 w-7 text-[--primary]" />
                )}
                <span className="text-sm font-medium capitalize">
                  {r === "familie" ? "Familie / Person" : "Anbieter"}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vorname</Label>
              <Input placeholder="Max" {...register("vorname")} />
              {errors.vorname && <p className="text-xs text-[--danger]">{errors.vorname.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nachname</Label>
              <Input placeholder="Mustermann" {...register("nachname")} />
              {errors.nachname && <p className="text-xs text-[--danger]">{errors.nachname.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>E-Mail</Label>
            <Input type="email" placeholder="name@example.de" {...register("email")} />
            {errors.email && <p className="text-xs text-[--danger]">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Passwort</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Mindestens 8 Zeichen"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--muted-foreground] hover:text-[--foreground]"
                onClick={() => setShowPw((p) => !p)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password strength bar */}
            {passwordValue.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="flex-1 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          strength.score >= level ? strength.barColor : "var(--border)",
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${strength.color}`}>
                    {strength.label}
                  </span>
                  {strength.tips[0] && (
                    <span className="text-xs text-[--muted-foreground]">
                      {strength.tips[0]}
                    </span>
                  )}
                </div>
              </div>
            )}
            {errors.password && <p className="text-xs text-[--danger]">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Postleitzahl</Label>
            <Input placeholder="10115" maxLength={5} {...register("plz")} />
            {errors.plz && <p className="text-xs text-[--danger]">{errors.plz.message}</p>}
          </div>

          {/* Honeypot field — visually hidden, intentionally not labeled (S278) */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
          >
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Registrieren…</>
            ) : (
              "Kostenlos registrieren"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-[--muted-foreground]">
          Bereits registriert?{" "}
          <Link href="/login" className="text-[--primary] hover:underline font-medium">
            Anmelden
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
