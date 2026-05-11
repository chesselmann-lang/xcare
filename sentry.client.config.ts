/**
 * Sentry Client-Side Konfiguration
 * Wird im Browser geladen — initialisiert Error- und Performance-Tracking.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay (nur Produktion, DSGVO-konform: keine PII)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,       // PII-Schutz: alle Texte maskieren
      blockAllMedia: true,     // keine Screenshots von Uploads
    }),
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
      triggerLabel: "Feedback",
      formTitle: "Feedback senden",
      submitButtonLabel: "Senden",
      cancelButtonLabel: "Abbrechen",
      nameLabel: "Name",
      emailLabel: "E-Mail",
      messageLabel: "Was ist passiert?",
      messagePlaceholder: "Beschreiben Sie das Problem…",
    }),
  ],

  // Keine PII in Error-Reports
  beforeSend(event) {
    // E-Mail-Adressen aus Error-Messages entfernen
    if (event.message) {
      event.message = event.message.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[email]"
      );
    }
    return event;
  },

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
});
