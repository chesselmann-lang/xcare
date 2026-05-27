/**
 * PostHog analytics integration
 * Install: npm install posthog-js posthog-node
 */
import { PostHog } from "posthog-node";

// Server-side PostHog client
export const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

export async function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!posthog) return;
  posthog.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      source: "xcare-server",
    },
  });
  await posthog.flushAsync();
}

export function trackPageView(distinctId: string, url: string, properties?: Record<string, unknown>): void {
  if (!posthog) return;
  posthog.capture({
    distinctId,
    event: "$pageview",
    properties: { $current_url: url, ...properties },
  });
}

// Key events for xcare
export const EVENTS = {
  // Onboarding
  USER_REGISTERED: "user_registered",
  PROFILE_COMPLETED: "profile_completed",
  // KI Features
  PFLEGEGRAD_STARTED: "pflegegrad_assessment_started",
  PFLEGEGRAD_COMPLETED: "pflegegrad_assessment_completed",
  ANTRAG_CREATED: "antrag_created",
  ANTRAG_SUBMITTED: "antrag_submitted",
  // Marketplace
  ANBIETER_SEARCHED: "anbieter_searched",
  ANBIETER_BOOKED: "anbieter_booked",
  // Video
  VIDEO_CALL_STARTED: "video_call_started",
  VIDEO_CALL_ENDED: "video_call_ended",
  // Payments
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
} as const;
