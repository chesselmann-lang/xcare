import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "xcare – Ihr Pflege-Ökosystem",
    short_name: "xcare",
    description: "Finden Sie die passenden Pflege- und Sozialleistungen für Ihre Familie.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1A5276",
    orientation: "portrait",
    categories: ["health", "lifestyle", "social"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        // @ts-expect-error — form_factor is valid but not yet in Next.js types
        form_factor: "narrow",
      },
    ],
    shortcuts: [
      {
        name: "KI-Lotse starten",
        short_name: "Lotse",
        description: "Personalisierte Empfehlungen erhalten",
        url: "/lotse",
        icons: [{ src: "/icon-96.png", sizes: "96x96" }],
      },
      {
        name: "Anbieter suchen",
        short_name: "Suche",
        description: "Passende Anbieter in Ihrer Nähe finden",
        url: "/suche",
        icons: [{ src: "/icon-96.png", sizes: "96x96" }],
      },
    ],
  };
}
