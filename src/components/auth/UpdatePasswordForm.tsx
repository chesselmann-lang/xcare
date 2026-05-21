"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { scorePassword } from "@/lib/password-strength";

const schema = z
  .object({
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

export function UpdatePasswordForm() {
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch("password") ?? "";
  const strength = scorePassword(passwordValue);

  async function onSubmit(data: FormData) {
    setError(null);
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (error) {
      setError("Passwort konnte nicht geändert werden. Bitte versuche es erneut.");
      return;
    }
    router.push("/login?updated=1");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Neues Passwort setzen</CardTitle>
        <CardDescription>
          Wähle ein sicheres Passwort mit mindestens 8 Zeichen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Neues Passwort</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                autoFocus
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--muted-foreground] hover:text-[--foreground]"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {/* Strength bar */}
            {passwordValue.length > 0 && (
              <div className="space-y-1 mt-1">
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
                  <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
                  {strength.tips[0] && (
                    <span className="text-xs text-[--muted-foreground]">{strength.tips[0]}</span>
                  )}
                </div>
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-[--danger]">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Passwort bestätigen</Label>
            <Input
              id="confirm"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className="text-xs text-[--danger]">{errors.confirm.message}</p>
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Speichere…
              </>
            ) : (
              "Passwort speichern"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
