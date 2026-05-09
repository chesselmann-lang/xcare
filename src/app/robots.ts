import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare-git-main-mindry.vercel.app";
  return {
    rules: [
      {
        // Allow all crawlers on public pages
        userAgent: "*",
        allow: [
          "/",
          "/suche",
          "/lotse",
          "/anbieter",          // public directory listing
          "/anbieter/",         // individual anbieter profiles (public)
          "/impressum",
          "/datenschutz",
          "/login",
          "/register",
        ],
        disallow: [
          "/familie/",          // Familie dashboard (private)
          "/anbieter/profil",   // Anbieter edit pages (private)
          "/anbieter/leistungen",
          "/anbieter/anfragen",
          "/anbieter/nachrichten",
          "/anbieter/statistiken",
          "/anbieter/dokumente",
          "/anbieter/team",
          "/anbieter/abo",
          "/admin/",            // Admin panel
          "/api/",              // API routes
          "/onboarding",
          "/einstellungen",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
