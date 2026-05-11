"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return supabase;
}

export interface WhiteLabelFormData {
  slug: string;
  organisation: string;
  domain: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_family: string;
  impressum_url: string;
  datenschutz_url: string;
  support_email: string;
  support_tel: string;
  aktiv: boolean;
  feature_ki_lotse: boolean;
  feature_anbieter_suche: boolean;
  feature_pflegekrafte: boolean;
  feature_traeger_portal: boolean;
  feature_dokumente_tresor: boolean;
  feature_chat: boolean;
}

function formDataToRecord(data: WhiteLabelFormData) {
  return {
    slug: data.slug.toLowerCase().trim(),
    organisation: data.organisation.trim(),
    domain: data.domain.trim() || null,
    color_primary: data.color_primary,
    color_secondary: data.color_secondary,
    color_accent: data.color_accent,
    font_family: data.font_family || "Inter",
    impressum_url: data.impressum_url.trim() || null,
    datenschutz_url: data.datenschutz_url.trim() || null,
    support_email: data.support_email.trim() || null,
    support_tel: data.support_tel.trim() || null,
    aktiv: data.aktiv,
    features: {
      ki_lotse: data.feature_ki_lotse,
      anbieter_suche: data.feature_anbieter_suche,
      pflegekrafte: data.feature_pflegekrafte,
      traeger_portal: data.feature_traeger_portal,
      dokumente_tresor: data.feature_dokumente_tresor,
      chat: data.feature_chat,
    },
    updated_at: new Date().toISOString(),
  };
}

export async function createWhiteLabel(formData: WhiteLabelFormData) {
  const supabase = await requireAdmin();

  const record = {
    ...formDataToRecord(formData),
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("white_label_configs").insert(record);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/white-label");
  redirect("/admin/white-label");
}

export async function updateWhiteLabel(id: string, formData: WhiteLabelFormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("white_label_configs")
    .update(formDataToRecord(formData))
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/white-label");
  redirect("/admin/white-label");
}

export async function toggleWhiteLabelAktiv(id: string, aktiv: boolean) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("white_label_configs")
    .update({ aktiv, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/white-label");
}
