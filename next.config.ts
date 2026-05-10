import type { NextConfig } from "next";

/**
 * Content Security Policy
 *
 * Notes:
 * - 'unsafe-inline' for scripts is required by Next.js (inline hydration scripts)
 * - 'unsafe-eval' is required by Next.js dev mode; in production it can be removed,
 *   but since we ship a single binary we leave it and rely on other defences.
 * - Supabase realtime uses WSS; we allow wss://*.supabase.co for Supabase Realtime.
 * - Maplibre/Mapbox tiles come from tile CDNs.
 * - Stripe.js loads from js.stripe.com.
 */
const CSP = [
  "default-src 'self'",

  // Scripts — Next.js needs unsafe-inline for hydration + Stripe + Inngest
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net",

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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 768, 1024, 1280, 1536],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Content Security Policy
          { key: "Content-Security-Policy", value: CSP },

          // Existing headers
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" },

          // HSTS — Vercel always serves HTTPS, safe to enable.
          // 2-year max-age. Add preload once domain is registered with HSTS preload list.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },

          // Prevent this origin's documents from sharing a browsing context group
          // with cross-origin documents (e.g. prevents Spectre-style attacks).
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },

          // Prevents cross-origin resources from being loaded in a different origin's
          // context — limits cross-site resource leakage.
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },

          // X-Frame-Options is superseded by CSP frame-ancestors, but kept for legacy browsers
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      {
        // API routes: no CSP needed, ensure no caching of sensitive responses
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        // Aggressive caching for immutable static assets
        source: "/(.*)\\.(ico|png|jpg|jpeg|webp|avif|svg|woff2?)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Compress responses
  compress: true,
};

export default nextConfig;
