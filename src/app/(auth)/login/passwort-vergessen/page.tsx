import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen | xcare",
  description: "Setze dein xcare-Passwort zurück.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <ForgotPasswordForm />
    </div>
  );
}
