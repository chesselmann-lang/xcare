import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzerFactory from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerFactory({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/**
 * Content Security Policy
 *
 * Notes:
 * - 'unsafe-inline' for scripts is required by Next.js (inline hydration scripts)
 * - Supabase realtime uses WSS; we allow wss://*.supabase.co for Supabase Realtime.
 * - Maplibre/Mapbox tiles come from tile CDNs.
 * - Stripe.js loads from js.stripe.com.
 * - Sentry tunnel proxies events through /api/monitoring/tunnel (no external CSP needed).
 */
const CSP = [
  "default-src 'self'",

  // Scripts — unsafe-eval intentionally omitted (S277); nonces injected via middleware for dynamic routes
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net",

  // Styles — Tailwind + inline <style> tags
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

  // Fonts
  "font-src 'self' https://fonts.gstatic.com data:",

  // Images — Supabase storage, GitHub avatars, map tiles, data URIs
  [
    "img-src 'self' data: blob:",
    "https://*.supabase.co",
    "https://avatars.githubusercontent.com",
    "https://*.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
    "https://maptiles.p.rapidapi.com",
  ].join(" "),

  // Fetch / XHR — Supabase REST + Auth, Anthropic API (server-side only but allow for edge), Stripe, Inngest
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",       // Supabase Realtime
    "https://api.anthropic.com",
    "https://api.stripe.com",
    "https://inn.gs",            // Inngest cloud
    "https://api.inngest.com",
    process.env.NODE_ENV === "development" ? "ws://localhost:* http://localhost:*" : "",
  ].filter(Boolean).join(" "),

  // Frames — only allow Stripe
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",

  // Prevent this site from being embedded in iframes (replaces X-Frame-Options)
  "frame-ancestors 'none'",

  // Form actions only to self
  "form-action 'self'",

  // Workers (service worker for PWA)
  "worker-src 'self' blob:",

  // Manifest
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Required for Docker multi-stage build (Dockerfile copies .next/standalone)
  output: "standalone",

  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 768, 1024, 1280, 1536],
  },

  // Optimierung: Tree-shake bekannte Heavy-Dependencies
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-progress",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "date-fns",
      "ai",
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|webp|avif|svg|woff2?)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  compress: true,
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, {
  // Sentry-Organisation + Projekt (aus SENTRY_ORG/SENTRY_PROJECT env vars)
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source Maps: nur auf Sentry hochladen, nicht öffentlich ausliefern
  widenClientFileUpload: true,
  hideSourceMaps: true,

  // Sentry Tunnel — Events über eigene Domain proxyen (vermeidet Ad-Blocker)
  tunnelRoute: "/api/monitoring/tunnel",

  // Tree-Shaking für Sentry in Client-Bundle
  disableLogger: true,

  // Automatisches Instrumentation für Server Components
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
}));
