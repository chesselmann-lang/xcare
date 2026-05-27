# xcare — New Service Integrations Setup

This document covers installation and configuration for the four new service integrations added under `src/lib/`.

---

## 1. Upstash Redis — Rate Limiting & Caching

**File:** `src/lib/redis.ts`

### Install

```bash
npm install @upstash/redis @upstash/ratelimit
```

### Get credentials

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database (select **EU-West-1** for German data residency)
3. Copy the REST URL and REST Token from the database details page

### Environment variables

```env
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### Rate limiter defaults

| Limiter | Algorithm      | Limit             |
|---------|---------------|-------------------|
| `api`   | Sliding window | 60 req / 1 min    |
| `ai`    | Sliding window | 10 req / 1 min    |
| `auth`  | Fixed window   | 5 attempts / 15 min |

### Usage

```typescript
import { checkRateLimit, cacheGet, cacheSet } from "@/lib/redis";

// Rate limiting
const result = await checkRateLimit("ai", userId);
if (!result.success) return new Response("Too Many Requests", { status: 429 });

// Caching (default TTL: 300 seconds)
await cacheSet("pflegegrad:userId123", data, 600);
const cached = await cacheGet<MyType>("pflegegrad:userId123");
```

> The client degrades gracefully to no-ops if env vars are missing — safe in local dev.

---

## 2. PostHog — Product Analytics

**File:** `src/lib/posthog.ts`

### Install

```bash
npm install posthog-js posthog-node
```

### Get credentials

1. Go to [app.posthog.com](https://app.posthog.com) (EU cloud: [eu.posthog.com](https://eu.posthog.com))
2. Create a project → copy the **Project API Key**
3. For EU data residency use host `https://eu.posthog.com`

### Environment variables

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
```

### Client-side setup (PostHog JS)

Add to `src/app/layout.tsx` or a `PostHogProvider` component:

```typescript
// app/providers.tsx
"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // handled manually
    });
  }, []);
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

### Usage (server-side)

```typescript
import { trackEvent, EVENTS } from "@/lib/posthog";

await trackEvent(userId, EVENTS.PFLEGEGRAD_COMPLETED, { grade: 3 });
await trackEvent(userId, EVENTS.ANTRAG_SUBMITTED, { antragId });
```

---

## 3. Twilio — SMS Notifications

**File:** `src/lib/twilio.ts`

### Install

```bash
npm install twilio
```

### Get credentials

1. Sign up at [twilio.com/console](https://www.twilio.com/console)
2. Get a phone number (choose a German +49 number for local sender ID)
3. Copy Account SID and Auth Token from the console dashboard

### Environment variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+49xxxxxxxxxx
```

### Usage

```typescript
import { sendSms, SMS_TEMPLATES } from "@/lib/twilio";

// Custom message
await sendSms({ to: "+49171234567", message: "Ihre Anfrage wurde bearbeitet." });

// Pre-built templates
await sendSms({
  to: carerPhone,
  message: SMS_TEMPLATES.notfallAlert(patientName, situation),
});

await sendSms({
  to: userPhone,
  message: SMS_TEMPLATES.terminErinnerung(userName, "Mo. 10:00 Uhr", anbieterName),
});
```

> Twilio uses dynamic import — the package only loads at runtime when SMS is actually sent. The wrapper returns `{ success: false }` if unconfigured rather than throwing.

---

## 4. Daily.co — Video Consultations

**File:** `src/lib/daily.ts`

### Install

```bash
# Server-side API wrapper — no package needed (uses fetch)
# Client-side video UI:
npm install @daily-co/daily-js
```

### Get credentials

1. Go to [dashboard.daily.co](https://dashboard.daily.co)
2. Create an account → copy the **API Key** from Settings → Developers
3. Note: EU geo routing (`geo: "eu"`) is already set in the wrapper

### Environment variables

```env
DAILY_API_KEY=your_daily_api_key_here
```

### Usage (server-side room management)

```typescript
import { createRoom, createMeetingToken, deleteRoom } from "@/lib/daily";

// Create a room for a consultation
const room = await createRoom({
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
  maxParticipants: 4,
  enableRecording: true,
});

// Issue tokens for each participant
const caregiverToken = await createMeetingToken({
  roomName: room.name,
  userId: caregiverId,
  userName: caregiverName,
  isOwner: true,
});

const patientToken = await createMeetingToken({
  roomName: room.name,
  userId: patientId,
  userName: patientName,
});

// Clean up when done
await deleteRoom(room.name);
```

### Usage (client-side video UI)

```typescript
"use client";
import DailyIframe from "@daily-co/daily-js";

const callFrame = DailyIframe.createFrame(containerEl, {
  showLeaveButton: true,
  iframeStyle: { width: "100%", height: "100%" },
});

await callFrame.join({ url: room.url, token: meetingToken });
```

---

## 5. Rate Limit API Endpoint

**File:** `src/app/api/rate-limit/route.ts`

A lightweight GET endpoint clients can call to check remaining quota before making expensive requests.

```
GET /api/rate-limit?limiter=ai
GET /api/rate-limit?limiter=api
GET /api/rate-limit?limiter=auth
```

**Response (200):**
```json
{ "ok": true, "remaining": 8 }
```

**Response (429):**
```json
{ "error": "Rate limit exceeded", "reset": 1716825600000 }
```

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

---

## Summary — all env vars to add

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Daily.co
DAILY_API_KEY=
```

All integrations degrade gracefully when env vars are absent — the app runs normally in local development without any of these configured.
