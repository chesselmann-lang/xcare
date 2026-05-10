/**
 * Next.js Instrumentation Hook (v13.2+)
 * Runs once at server startup (Node.js runtime only) before any requests are served.
 * Used here to validate all required environment variables fail-fast.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import so this only runs server-side and tree-shakes cleanly from Edge
    await import("@/lib/env");
  }
}
