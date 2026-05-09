import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare-git-main-mindry.vercel.app";

  const supabase = await createClient();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/suche`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/lotse`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Dynamic: Anbieter-Profilseiten
  try {
    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id, updated_at")
      .eq("aktiv", true)
      .eq("verifiziert", true)
      .limit(500);

    const anbieterRoutes: MetadataRoute.Sitemap =
      anbieter?.map((a) => ({
        url: `${baseUrl}/anbieter/${a.id}`,
        lastModified: new Date(a.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })) ?? [];

    return [...staticRoutes, ...anbieterRoutes];
  } catch {
    return staticRoutes;
  }
}
