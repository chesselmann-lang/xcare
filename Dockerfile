# syntax=docker/dockerfile:1

# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json ./
# package-lock.json contains stub entries (empty {}) for some packages which cause
# npm ci / npm install to throw "Invalid Version:" errors. Omit the lockfile so
# npm resolves versions fresh from the registry — acceptable for a dev hot-reload container.
RUN npm install --legacy-peer-deps

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG NEXT_PUBLIC_POSTHOG_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_PROJECT=$SENTRY_PROJECT \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.source="https://github.com/chesselmann-lang/xcare" \
      org.opencontainers.image.description="xcare – Care-Ökosystem" \
      org.opencontainers.image.licenses="UNLICENSED" \
      org.opencontainers.image.vendor="whatsdigital" \
      org.opencontainers.image.title="xcare"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public folder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
