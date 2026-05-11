import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import WhiteLabelForm from "../../WhiteLabelForm";
import type { WhiteLabelFormData } from "../../actions";

export const metadata = { title: "Partner bearbeiten | Admin xcare" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminWhiteLabelBearbeitenPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: config } = await supabase
    .from("white_label_configs")
    .select("*")
    .eq("id", id)
    .single();

  if (!config) notFound();

  const features = config.features as Record<string, boolean>;

  const defaultValues: WhiteLabelFormData = {
    slug: config.slug,
    organisation: config.organisation,
    domain: config.domain ?? "",
    color_primary: config.color_primary,
    color_secondary: config.color_secondary,
    color_accent: config.color_accent,
    font_family: config.font_family ?? "Inter",
    impressum_url: config.impressum_url ?? "",
    datenschutz_url: config.datenschutz_url ?? "",
    support_email: config.support_email ?? "",
    support_tel: config.support_tel ?? "",
    aktiv: config.aktiv ?? true,
    feature_ki_lotse: features.ki_lotse ?? true,
    feature_anbieter_suche: features.anbieter_suche ?? true,
    feature_pflegekrafte: features.pflegekrafte ?? true,
    feature_traeger_portal: features.traeger_portal ?? false,
    feature_dokumente_tresor: features.dokumente_tresor ?? true,
    feature_chat: features.chat ?? true,
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/white-label"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          White-Label Partner
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
          style={{ background: config.color_primary }}
        >
          {config.organisation.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.organisation} bearbeiten</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{config.slug}</code>
            {config.domain && (
              <span className="ml-2 text-gray-400">· {config.domain}</span>
            )}
          </p>
        </div>
      </div>

      <WhiteLabelForm mode="edit" id={id} defaultValues={defaultValues} />
    </div>
  );
}
