"use server";

/**
 * Server actions for on-demand cache invalidation.
 *
 * Client components cannot import `revalidateTag` directly (it only runs on
 * the server). These thin wrappers let any "use client" component bust the
 * relevant unstable_cache entries after a successful mutation.
 *
 * Usage (from a client component):
 *   import { revalidateAnbieterCache } from "@/lib/cache-actions";
 *   await revalidateAnbieterCache(anbieter.id);
 */

import { revalidateTag } from "next/cache";

/** Bust the public profile page and any list that contains this anbieter. */
export async function revalidateAnbieterCache(id: string) {
  revalidateTag(`anbieter-${id}`);
  revalidateTag("anbieter-list");
}

/** Bust the homepage testimonials carousel (5-star reviews). */
export async function revalidateTestimonialsCache() {
  revalidateTag("testimonials");
}

/**
 * Bust everything that can change when a bewertung is created / deleted:
 * the specific anbieter profile AND the testimonials carousel.
 */
export async function revalidateBewertungCache(anbieter_id: string) {
  revalidateTag(`anbieter-${anbieter_id}`);
  revalidateTag("anbieter-list");
  revalidateTag("testimonials");
}
