/**
 * Synchronous Supabase service-role client.
 *
 * Use this (instead of createAdminClient from server.ts) wherever you need
 * a plain, non-async admin client — e.g. inside unstable_cache callbacks or
 * Inngest handlers that cannot await a dynamic import at the call-site.
 *
 * Never expose the service-role key to the client bundle.
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
