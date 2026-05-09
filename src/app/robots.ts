import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare-git-main-mindry.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/suche", "/lotse", "/anbieter/"],
        disallow: ["/familie/", "/anbieter/profil", "/anbieter/leistungen", "/anbieter/anfragen", "/admin/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
