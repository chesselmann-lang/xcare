"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben"),
});
type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${baseUrl}/auth/update-password`,
    });
    // Always show success to avoid email enumeration
    setSentEmail(data.email);
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">E-Mail gesendet</CardTitle>
          <CardDescription>
            Falls ein Konto für{" "}
            <span className="font-medium text-[--foreground]">{sentEmail}</span>{" "}
            existiert, haben wir einen Reset-Link gesendet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[--muted-foreground] text-center">
            Bitte prüfe deinen Posteingang und klicke auf den Link in der
            E-Mail. Der Link ist 24 Stunden gültig.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-[--primary] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Zurück zur Anmeldung
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Passwort zurücksetzen</CardTitle>
        <CardDescription>
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Reset-Link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.de"
              autoFocus
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-[--danger]">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sende Link…
              </>
            ) : (
              "Reset-Link senden"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-[--muted-foreground] hover:text-[--foreground]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Zurück zur Anmeldung
        </Link>
      </CardFooter>
    </Card>
  );
}
