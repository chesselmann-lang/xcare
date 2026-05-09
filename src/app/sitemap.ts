import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const KATEGORIE_SLUGS = [
  "pflege_ambulant", "pflege_stationaer", "tagespflege", "kurzzeitpflege",
  "beratung", "foerderung", "therapie", "haushaltshilfe",
  "kinderbetreuung", "jugendhilfe", "eingliederungshilfe",
  "hospizdienst", "trauerhilfe", "sonstiges",
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
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Category directory pages
  const kategorieRoutes: MetadataRoute.Sitemap = KATEGORIE_SLUGS.map((slug) => ({
    url: `${baseUrl}/anbieter?kategorie=${slug}`,
    lastModified: new Date(),
    c