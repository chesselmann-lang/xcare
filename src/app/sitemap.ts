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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare-git-main-mindry.vercel.app";

  const supabase = await createClient();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/suche`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/lotse`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/anbieter`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${baseUrl}/lebenslage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Category directory pages
  const kategorieRoutes: MetadataRoute.Sitemap = KATEGORIE_SLUGS.map((slug) => ({
    url: `${baseUrl}/anbieter?kategorie=${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  // Lebenslage landing pages
  const lebenslagenRoutes: MetadataRoute.Sitemap = LEBENSLAGE_SLUGS.map((slug) => ({
    url: `${baseUrl}/lebenslage/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // Dynamic: Anbieter-Profilseiten
  try {
    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id, updated_at")
      .eq("aktiv", true)
      .eq("verifiziert", true)
      .limit(500);

    const anbieterRoutes: MetadataRoute.Sitemap =
      anbieter?.flatMap((a) => [
        {
          url: `${baseUrl}/anbieter/${a.id}`,
          lastModified: new Date(a.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
        {
          url: `${baseUrl}/anbieter/${a.id}/bewertungen`,
          lastModified: new Date(a.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        },
      ]) ?? [];

    return [...staticRoutes, ...kategorieRoutes, ...lebenslagenRoutes, ...anbieterRoutes];
  } catch {
    return [...staticRoutes, ...kategorieRoutes, ...lebenslagenRoutes];
  }
}
