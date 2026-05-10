import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const KATEGORIE_SLUGS = [
  "pflege_ambulant", "pflege_stationaer", "tagespflege", "kurzzeitpflege",
  "beratung", "foerderung", "therapie", "haushaltshilfe",
  "kinderbetreuung", "jugendhilfe", "eingliederungshilfe",
  "hospizdienst", "trauerhilfe", "sonstiges",
];

const LEBENSLAGE_SLUGS = [
  "alter-pflege",
  "geburt-fruehe-kindheit",
  "schulkind-jugend",
  "eingliederung-behinderung",
  "erwerbsleben-vereinbarkeit",
  "krankheit-genesung",
  "hospiz-palliativ",
  "trauer-nachlass",
];

const PAGE_SIZE = 1000;

/** Fetch all active Anbieter rows with cursor-based pagination to avoid 500-row cap. */
async function fetchAllActiveAnbieter(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const rows: { id: string; updated_at: string; verifiziert: boolean }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("anbieter")
      .select("id, updated_at, verifiziert")
      .eq("aktiv", true)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare-git-main-mindry.vercel.app";

  const supabase = await createClient();

  // ── Static routes ────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/suche`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/lotse`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/anbieter`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${baseUrl}/lebenslage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/datenschutz`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/agb`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/impressum`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // ── Category directory pages ─────────────────────────────────────────────
  const kategorieRoutes: MetadataRoute.Sitemap = KATEGORIE_SLUGS.map((slug) => ({
    url: `${baseUrl}/anbieter?kategorie=${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  // ── Lebenslage landing pages ─────────────────────────────────────────────
  const lebenslagenRoutes: MetadataRoute.Sitemap = LEBENSLAGE_SLUGS.map((slug) => ({
    url: `${baseUrl}/lebenslage/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // ── Dynamic: all active Anbieter profiles ───────────────────────────────
  try {
    const anbieter = await fetchAllActiveAnbieter(supabase);

    const anbieterRoutes: MetadataRoute.Sitemap = anbieter.flatMap((a) => [
      {
        url: `${baseUrl}/anbieter/${a.id}`,
        lastModified: new Date(a.updated_at),
        changeFrequency: "weekly" as const,
        // Verified providers get a slight priority boost for SEO
        priority: a.verifiziert ? 0.8 : 0.65,
      },
      {
        url: `${baseUrl}/anbieter/${a.id}/bewertungen`,
        lastModified: new Date(a.updated_at),
        changeFrequency: "weekly" as const,
        priority: a.verifiziert ? 0.55 : 0.4,
      },
    ]);

    return [
      ...staticRoutes,
      ...kategorieRoutes,
      ...lebenslagenRoutes,
      ...anbieterRoutes,
    ];
  } catch {
    // Degrade gracefully — return static routes if DB is unavailable
    return [...staticRoutes, ...kategorieRoutes, ...lebenslagenRoutes];
  }
}
