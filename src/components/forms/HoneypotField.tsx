"use client";

/**
 * HoneypotField — anti-bot trap for forms (S278)
 *
 * Usage (client form):
 *   <form>
 *     <HoneypotField />
 *     {/* real fields *\/}
 *   </form>
 *
 * Usage (server action / API route):
 *   const clean = validateHoneypot(formData);
 *   if (!clean) return { error: "Bot detected" };
 *
 * Real users never see or fill the field (visually hidden + tabIndex=-1).
 * Bots that auto-fill all inputs will populate it, triggering the check.
 */

// ── Client component ──────────────────────────────────────────────────────────

export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        opacity: 0,
        height: 0,
        overflow: "hidden",
      }}
      tabIndex={-1}
    >
      <label htmlFor="website_url">Website (leave blank)</label>
      <input
        type="text"
        id="website_url"
        name="website_url"
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  );
}

// ── Server-side validator ─────────────────────────────────────────────────────

/**
 * Returns true if the honeypot field is clean (no bot detected).
 * Returns false if a bot has filled the hidden field.
 *
 * @example
 *   export async function action(formData: FormData) {
 *     if (!validateHoneypot(formData)) {
 *       return { error: "Spam detected" };
 *     }
 *   }
 */
export function validateHoneypot(formData: FormData): boolean {
  const honeypot = formData.get("website_url");
  return !honeypot || honeypot === "";
}
