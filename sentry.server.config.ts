/**
 * Sentry Server-Side Konfiguration
 * Läuft in Node.js (API Routes, Server Components, Server Actions).
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Server-Tracing: Supabase-Queries, KI-Lotse-Calls, Stripe-Calls
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  integrations: [
    // Prisma/Supabase DB-Query-Tracing (via fetch instrumentation)
    Sentry.nativeNodeFetchIntegration(),
  ],

  // Sensitive Headers/Cookies nie loggen
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-supabase-auth"];
    }
    return event;
  },

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
});
