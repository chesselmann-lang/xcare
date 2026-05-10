import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neues Passwort setzen | xcare",
  description: "Setze ein neues Passwort für dein xcare-Konto.",
};

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <UpdatePasswordForm />
    </div>
  );
}
