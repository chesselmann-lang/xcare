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
          "/anbieter/",         // individual anbieter prof