import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComplianceDashboard } from "@/components/admin/compliance/ComplianceDashboard";
import { ComplianceBericht } from "@/components/admin/compliance/ComplianceBericht";

export const metadata: Metadata = {
  title: "Compliance | xcare Admin",
  description: "DSGVO-Compliance-Dashboard für xcare-Administratoren",
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";

export default async function CompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/admin");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="text-gray-500 text-sm mt-1">
          DSGVO-Übersicht, AVV-Verwaltung und Audit-Log
        </p>
      </div>

      <ComplianceDashboard berichtContent={<ComplianceBericht />} />
    </div>
  );
}
