"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm({ next, updated, authError }: { next?: string; updated?: boolean; authError?: string }) {
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setError("E-Mail oder Passwort ungültig.");
      return;
    }
    router.push(next ?? "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
        <CardDescription>Melde dich bei xcare an</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.de"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-[--danger]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Passwort</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--muted-foreground] hover:text-[--foreground]"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-[--danger]">{errors.password.message}</p>
            )}
            <div className="flex justify-end">
              <Link
                href="/login/passwort-vergessen"
                className="text-xs text-[--muted-foreground] hover:text-[--primary] hover:underline"
              >
                Passwort vergessen?
              </Link>
            </div>
          </div>

          {updated && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              ✓ Passwort erfolgreich geändert. Bitte jetzt anmelden.
            </div>
          )}

          {authError && !error && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              {decodeURIComponent(authError)}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Anmelden…</>
            ) : (
              "Anmelden"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-[--muted-foreground]">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-[--primary] hover:underline font-medium">
            Jetzt registrieren
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
