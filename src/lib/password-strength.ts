/**
 * Lightweight password strength scorer — no external deps.
 *
 * Returns a score 0–4 and a label.
 */

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthLevel;
  label: string;
  color: string;        // Tailwind text/bg colour token
  barColor: string;     // raw CSS colour for the progress bar
  tips: string[];       // actionable suggestions shown to the user
}

export function scorePassword(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "", color: "", barColor: "transparent", tips: [] };
  }

  const criteria = {
    length8:    password.length >= 8,
    length12:   password.length >= 12,
    lowercase:  /[a-z]/.test(password),
    uppercase:  /[A-Z]/.test(password),
    digit:      /\d/.test(password),
    special:    /[^A-Za-z0-9]/.test(password),
    noRepeats:  !/(.)\1{2,}/.test(password), // no char repeated 3+ times
  };

  const tips: string[] = [];
  if (!criteria.length8)   tips.push("Mindestens 8 Zeichen");
  if (!criteria.length12)  tips.push("12+ Zeichen für maximale Sicherheit");
  if (!criteria.uppercase) tips.push("Großbuchstabe hinzufügen (A–Z)");
  if (!criteria.digit)     tips.push("Zahl hinzufügen (0–9)");
  if (!criteria.special)   tips.push("Sonderzeichen hinzufügen (!@#$…)");

  // Score calculation
  let score = 0;
  if (criteria.length8)    score++;
  if (criteria.length12)   score++;
  if (criteria.uppercase && criteria.lowercase) score++;
  if (criteria.digit)      score++;
  if (criteria.special)    score++;
  if (!criteria.noRepeats) score = Math.max(0, score - 1);

  // Map 0–5 down to 0–4
  const capped = Math.min(4, score) as StrengthLevel;

  const levels: Record<StrengthLevel, Omit<PasswordStrength, "tips" | "score">> = {
    0: { label: "Zu kurz",   color: "text-red-500",    barColor: "#ef4444" },
    1: { label: "Schwach",   color: "text-red-500",    barColor: "#ef4444" },
    2: { label: "Mäßig",     color: "text-amber-500",  barColor: "#f59e0b" },
    3: { label: "Gut",       color: "text-blue-500",   barColor: "#3b82f6" },
    4: { label: "Stark",     color: "text-green-600",  barColor: "#16a34a" },
  };

  return { score: capped, tips: tips.slice(0, 2), ...levels[capped] };
}
