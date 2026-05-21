/**
 * Email template helper — fetches DB-backed templates and renders
 * variable substitution with {{variable}} syntax.
 *
 * Falls back to the provided default if the template is not found or inactive.
 */
import { createAdminClient } from "@/lib/supabase/service";

export interface EmailTemplate {
  betreff: string;
  html: string;
  text?: string | null;
}

/**
 * Render a template string by replacing {{variable}} with values.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

/**
 * Load a named email template from the database.
 * Returns null if not found or inactive.
 */
export async function getEmailTemplate(
  name: string
): Promise<{ betreff: string; html: string; text: string | null } | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("email_templates")
      .select("betreff, html, text, aktiv")
      .eq("name", name)
      .eq("aktiv", true)
      .single();
    if (!data) return null;
    return { betreff: data.betreff, html: data.html, text: data.text ?? null };
  } catch {
    return null;
  }
}

/**
 * Render an email using a DB template (if available) or fall back to defaults.
 * Variables are substituted in both betreff and html/text.
 */
export async function renderEmailTemplate(
  name: string,
  vars: Record<string, string>,
  defaults: EmailTemplate
): Promise<EmailTemplate> {
  const tpl = await getEmailTemplate(name);
  const source = tpl ?? defaults;
  return {
    betreff: renderTemplate(source.betreff, vars),
    html: renderTemplate(source.html, vars),
    text: source.text ? renderTemplate(source.text, vars) : undefined,
  };
}
