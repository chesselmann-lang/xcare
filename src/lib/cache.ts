/**
 * Cached data fetchers using Next.js unstable_cache.
 *
 * These run on the server using the service-role client (no cookies needed)
 * so the results can be stored and reused across requests without hitting
 * Supabase on every page load.
 *
 * Cache tags:
 *   "homepage-stats"        – counts on the landing page
 *   "testimonials"          – top-5-star reviews shown on the landing page
 *   "anbieter-list"         – public anbieter directory / lebenslage pages
 *   "anbieter-{id}"         – single anbieter detail page
 *   "lebenslage-{slug}"     – lebenslage landing page anbieter list
 *
 * Call revalidateTag(tag) or revalidatePath(path) from server actions
 * after relevant mutations to keep the cache fresh on-demand.
 */

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";

// ── Homepage stats ────────────────────────────────────────────────────────────

export const getCachedHomepageStats = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [anbieterRes, anfragenRes, verifRes] = await Promise.all([
      supabase.from("anbieter").select("*", { count: "exact", head: true }).eq("aktiv", true),
      supabase.from("anfragen").select("*", { count: "exact", head: true }),
      supabase
        .from("anbieter")
        .select("*", { count: "exact", head: true })
        .eq("aktiv", true)
        .eq("verifiziert", true),
    ]);
    return {
      anbieterCount: anbieterRes.count ?? 0,
      anfragenCount: anfragenRes.count ?? 0,
      verifiziert: verifRes.count ?? 0,
    };
  },
  ["homepage-stats"],
  { revalidate: 3600, tags: ["homepage-stats"] }
);

// ── Homepage testimonials ─────────────────────────────────────────────────────

export const getCachedTestimonials = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("bewertungen")
      .select("id, sterne, kommentar, created_at, anbieter:anbieter_id(name, ort)")
      .eq("sterne", 5)
      .not("kommentar", "is", null)
      .order("created_at", { ascending: false })
      .limit(6);
    return data ?? [];
  },
  ["testimonials"],
  { revalidate: 3600, tags: ["testimonials"] }
);

// ── Single anbieter detail (public profile) ───────────────────────────────────

export function getCachedAnbieterDetail(id: string) {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const [anbieterRes, dokumenteRes, bewertungenRes] = await Promise.all([
        supabase
          .from("anbieter")
          .select("*, leistungen(*)")
          .eq("id", id)
          .eq("aktiv", true)
          .single(),
        supabase
          .from("anbieter_dokumente")
          .select("id, name, typ")
          .eq("anbieter_id", id)
          .eq("oeffentlich", true)
          .order("created_at", { ascending: false }),
        supabase.from("bewertungen").select("sterne").eq("anbieter_id", id),
      ]);
      return {
        anbieter: anbieterRes.data,
        dokumente: dokumenteRes.data ?? [],
        bewertungen: bewertungenRes.data ?? [],
      };
    },
    [`anbieter-detail-${id}`],
    { revalidate: 1800, tags: [`anbieter-${id}`, "anbieter-list"] }
  )();
}

// ── Lebenslage page anbieter list ─────────────────────────────────────────────

export function getCachedLebenslageanbieter(slug: string, dbValue: string) {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data: anbieter } = await supabase
        .from("anbieter")
        .select(
          "id, name, beschreibung, plz, ort, strasse, telefon, website, verifiziert, logo_url, abwesend, leistungen!inner(id, name, kategorie, aktiv)"
        )
        .eq("aktiv", true)
        .eq("abwesend", false)
        .eq("leistungen.aktiv", true)
        .ilike("leistungen.kategorie", `%${dbValue}%`)
        .limit(30);
      return anbieter ?? [];
    },
    [`lebenslage-anbieter-${slug}`],
    { revalidate: 1800, tags: [`lebenslage-${slug}`, "anbieter-list"] }
  )();
}
