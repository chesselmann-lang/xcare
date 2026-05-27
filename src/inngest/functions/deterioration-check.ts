import { inngest } from "@/lib/inngest";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/service";

const anthropic = new Anthropic();

export const deteriorationCheckFn = inngest.createFunction(
  { id: "deterioration-check", name: "Tägliche Frühwarnung-Analyse" },
  { cron: "0 7 * * *" }, // 7:00 AM daily
  async ({ step }) => {
    // Get all users with vitaldaten in the last 30 days
    const users = await step.run("fetch-users-with-data", async () => {
      const supabase = createAdminClient();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("vitaldaten")
        .select("user_id")
        .gte("gemessen_am", thirtyDaysAgo)
        .order("user_id");
      // Deduplicate
      return [...new Set((data || []).map((r: { user_id: string }) => r.user_id))];
    });

    // Process each user (max 50 per run to stay within time limits)
    for (const userId of (users as string[]).slice(0, 50)) {
      await step.run(`analyze-user-${userId}`, async () => {
        const supabase = createAdminClient();

        // Get last 14 days of data
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: vitaldaten } = await supabase
          .from("vitaldaten")
          .select("*")
          .eq("user_id", userId)
          .gte("gemessen_am", twoWeeksAgo)
          .order("gemessen_am", { ascending: false });

        if (!vitaldaten || vitaldaten.length < 3) return; // Not enough data

        // Group by type for trend analysis
        const grouped: Record<string, Array<{ wert: number; gemessen_am: string }>> = {};
        for (const v of vitaldaten) {
          if (!grouped[v.typ]) grouped[v.typ] = [];
          grouped[v.typ].push({ wert: Number(v.wert), gemessen_am: v.gemessen_am });
        }

        // AI analysis
        const prompt = `Analysiere diese Vitaldaten der letzten 14 Tage und erkenne Trends:

${Object.entries(grouped)
  .map(
    ([typ, werte]) =>
      `${typ}: ${werte
        .slice(0, 7)
        .map((w) => `${w.wert} (${new Date(w.gemessen_am).toLocaleDateString("de-DE")})`)
        .join(", ")}`
  )
  .join("\n")}

Identifiziere:
1. Bedenkliche Trends (z.B. kontinuierlich steigende Temperatur, sinkende O2-Sättigung)
2. Sturzrisiko-Indikatoren
3. Mögliche Verschlechterungen

Antworte als JSON mit dieser Struktur:
{
  "warnungen": [
    {
      "schweregrad": "niedrig|mittel|hoch|kritisch",
      "kategorie": "vitalwerte|mobilitat|ernaehrung|kognition|soziale_isolation|medikamente|sturzrisiko",
      "titel": "kurzer Titel",
      "beschreibung": "detaillierte Beschreibung",
      "massnahmen": ["Maßnahme 1", "Maßnahme 2"]
    }
  ]
}

Nur ausgeben wenn echte Handlungsrelevanz vorhanden. Leeres Array wenn alles im Normbereich.`;

        const message = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const text =
          message.content[0].type === "text" ? message.content[0].text : "{}";

        let warnungen: Array<{
          schweregrad: string;
          kategorie: string;
          titel: string;
          beschreibung: string;
          massnahmen: string[];
        }> = [];

        try {
          const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
          warnungen = parsed.warnungen || [];
        } catch {
          return;
        }

        // Save warnings
        for (const w of warnungen) {
          await supabase.from("fruehwarnungen").insert({
            user_id: userId,
            schweregrad: w.schweregrad,
            kategorie: w.kategorie,
            titel: w.titel,
            beschreibung: w.beschreibung,
            empfohlene_massnahmen: w.massnahmen,
            analysierte_tage: 14,
          });
        }
      });
    }

    return { analyzed: users.length };
  }
);
