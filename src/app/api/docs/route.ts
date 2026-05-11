import { NextResponse } from "next/server";

/**
 * GET /api/docs
 *
 * Returns the OpenAPI 3.1 specification for the xcare API.
 * Consumed by the Swagger UI at /api/docs/ui and by external tooling.
 *
 * Public access — no authentication required for the spec itself.
 * Individual endpoints enforce their own auth rules.
 */
export const dynamic = "force-static";
export const revalidate = 3600; // Re-generate at most once per hour

export function GET() {
  const spec = buildSpec();
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function buildSpec() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

  return {
    openapi: "3.1.0",
    info: {
      title: "xcare API",
      version: "3.0.0",
      description: `
# xcare REST API

Die xcare Plattform-API für Pflege-Ökosystem-Integrationen.

## Authentifizierung

Die meisten Endpunkte erfordern eine **Supabase JWT**-Authentifizierung:

\`\`\`
Authorization: Bearer <supabase-jwt>
\`\`\`

Tokens werden über Supabase Auth ausgestellt (\`/auth/v1/token\`).
Öffentliche Endpunkte (z. B. \`/api/traeger/anspruch-pruefen-anonym\`) benötigen keinen Token.

## Rate Limits

| Endpoint-Gruppe | Limit |
|----------------|-------|
| KI/Lotse (\`/api/ki\`, \`/api/copilot\`) | 10 req/min |
| Öffentliche APIs | 60 req/min |
| Authentifizierte APIs | 120 req/min |

## Versionierung

Die aktuelle API-Version ist **v3** (xcare v3.0.0).
Breaking changes werden unter einem neuen Pfad \`/api/v4/...\` veröffentlicht.
      `.trim(),
      contact: {
        name: "xcare Support",
        email: "api@xcare.de",
        url: `${baseUrl}/kontakt`,
      },
      license: {
        name: "Proprietär",
        url: `${baseUrl}/agb`,
      },
    },
    servers: [
      {
        url: baseUrl,
        description: "Production",
      },
      {
        url: "http://localhost:3000",
        description: "Lokale Entwicklung",
      },
    ],
    tags: [
      { name: "Anspruch", description: "Pflegeleistungs-Anspruchsprüfung (SGB XI/XII/EStG)" },
      { name: "Anbieter", description: "Pflegeanbieter-Verzeichnis & Suche" },
      { name: "KI", description: "KI-Pflegeberatung & Co-Pilot" },
      { name: "Träger", description: "B2B Träger-/Sozialamt-API" },
      { name: "Behörden", description: "AP5-konforme Behörden-Adapter" },
      { name: "Haushalt", description: "Haushaltsverwaltung & Vollmachten" },
      { name: "Dokumente", description: "Verschlüsselter Dokumenten-Tresor" },
      { name: "Nachrichten", description: "Echtzeit-Messaging zwischen Nutzern" },
      { name: "Stripe", description: "Zahlungsabwicklung & Abonnements" },
      { name: "Profil", description: "Nutzerprofil & Datenschutz" },
      { name: "System", description: "Health-Checks & Monitoring" },
    ],
    paths: {
      // ── Anspruch ─────────────────────────────────────────────────────────────
      "/api/anspruch": {
        post: {
          tags: ["Anspruch"],
          summary: "Anspruch berechnen",
          description: "Berechnet Pflegeleistungsansprüche basierend auf Pflegegrad, Lebenssituation und Haushalt nach SGB XI/XII und EStG.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pflegegrad", "lebenslage"],
                  properties: {
                    pflegegrad: {
                      type: "integer",
                      minimum: 1,
                      maximum: 5,
                      description: "Pflegegrad 1–5",
                    },
                    lebenslage: {
                      type: "string",
                      enum: ["alter", "behinderung", "chronische_erkrankung", "demenz", "palliativ"],
                    },
                    haushalt: {
                      type: "object",
                      description: "Optionale Haushaltsdaten für erweiterte Berechnung",
                    },
                  },
                },
                example: {
                  pflegegrad: 3,
                  lebenslage: "alter",
                  haushalt: { mitglieder: 2 },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Anspruchsberechnung erfolgreich",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AnspruchErgebnis" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },

      // ── KI ──────────────────────────────────────────────────────────────────
      "/api/ki": {
        post: {
          tags: ["KI"],
          summary: "KI-Pflegeberatung (Streaming)",
          description: "Interaktive KI-gestützte Pflegeberatung via Server-Sent Events. Antwortet als Streaming-Response.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["messages"],
                  properties: {
                    messages: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ChatMessage" },
                    },
                    kontext: {
                      type: "object",
                      description: "Optionaler Nutzerkontext (Pflegegrad, Lebenslage …)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Streaming-Antwort (text/event-stream)",
              content: { "text/event-stream": { schema: { type: "string" } } },
            },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },

      "/api/copilot": {
        post: {
          tags: ["KI"],
          summary: "KI-Co-Pilot mit Tool-Use",
          description: "Erweiterter KI-Co-Pilot mit Zugriff auf strukturierte Tools (Anspruchsrechner, Anbietersuche, Terminplanung).",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["messages"],
                  properties: {
                    messages: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ChatMessage" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Streaming Tool-Response" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },

      // ── Träger ───────────────────────────────────────────────────────────────
      "/api/traeger/anspruch-pruefen": {
        post: {
          tags: ["Träger"],
          summary: "Anspruch prüfen (authentifiziert)",
          description: "Prüft Pflegeleistungsansprüche für einen Klienten. Erfordert aktives Träger-Profil.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TraegerPruefungInput" },
                example: {
                  klienten_id: "uuid",
                  pflegegrad: 2,
                  lebenslage: "alter",
                  geburtsjahr: 1945,
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Anspruchsprüfung abgeschlossen",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AnspruchErgebnis" },
                },
              },
            },
            "403": { $ref: "#/components/responses/Forbidden" },
          },
        },
      },

      "/api/traeger/anspruch-pruefen-anonym": {
        post: {
          tags: ["Träger"],
          summary: "Anspruch prüfen (anonym / öffentlich)",
          description: "Öffentlicher Endpunkt für anonyme Anspruchsprüfungen. Kein Token erforderlich. Rate-limitiert.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TraegerPruefungInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Anonyme Anspruchsprüfung",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AnspruchErgebnis" },
                },
              },
            },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },

      // ── Behörden (AP5) ────────────────────────────────────────────────────────
      "/api/behoerden/{adapter}": {
        get: {
          tags: ["Behörden"],
          summary: "Behördenadapter abfragen",
          description: "AP5-konforme Schnittstellenadapter für Behördenabfragen. Unterstützte Adapter: `elster`, `datenaustausch`, `mdpv`, `sgb`, `bundid`, `rente`, `wohngeld`, `bafoeg`.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: "adapter",
              in: "path",
              required: true,
              schema: {
                type: "string",
                enum: ["elster", "datenaustausch", "mdpv", "sgb", "bundid", "rente", "wohngeld", "bafoeg"],
              },
            },
            {
              name: "action",
              in: "query",
              schema: { type: "string" },
              description: "Adapter-spezifische Aktion",
            },
          ],
          responses: {
            "200": {
              description: "Adapter-Antwort (Stub oder Live-Daten)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      adapter: { type: "string" },
                      status: { type: "string", enum: ["stub", "live", "error"] },
                      data: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Behörden"],
          summary: "Behördenadapter aufrufen",
          description: "Sendet Daten an einen AP5-konformen Behördenadapter.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: "adapter",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { type: "object" } },
            },
          },
          responses: {
            "200": { description: "Adapter-Antwort" },
            "501": { description: "Adapter noch nicht implementiert (Stub)" },
          },
        },
      },

      // ── Nachrichten ──────────────────────────────────────────────────────────
      "/api/nachrichten": {
        get: {
          tags: ["Nachrichten"],
          summary: "Nachrichten abrufen",
          description: "Gibt Nachrichten für eine Anfrage zurück. Erfordert `anfrage_id` als Query-Parameter.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: "anfrage_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Nachrichten-Liste",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      nachrichten: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Nachricht" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Nachrichten"],
          summary: "Nachricht senden",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["anfrage_id", "inhalt"],
                  properties: {
                    anfrage_id: { type: "string", format: "uuid" },
                    inhalt: { type: "string", maxLength: 5000 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Nachricht erstellt" },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
      },

      // ── Stripe ───────────────────────────────────────────────────────────────
      "/api/stripe/checkout": {
        post: {
          tags: ["Stripe"],
          summary: "Checkout-Session erstellen",
          description: "Erstellt eine Stripe Checkout Session für ein Anbieter-Abonnement.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plan_id"],
                  properties: {
                    plan_id: {
                      type: "string",
                      enum: ["starter", "professional"],
                    },
                    billing_period: {
                      type: "string",
                      enum: ["monthly", "yearly"],
                      default: "monthly",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Checkout-URL",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      url: { type: "string", format: "uri" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/stripe/connect": {
        post: {
          tags: ["Stripe"],
          summary: "Connect-Onboarding starten",
          description: "Erstellt oder holt eine Stripe Connect Onboarding-URL für Care-Worker.",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": {
              description: "Onboarding-URL",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      url: { type: "string", format: "uri" },
                      account_id: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── Profil ────────────────────────────────────────────────────────────────
      "/api/profil/export": {
        get: {
          tags: ["Profil"],
          summary: "Nutzerdaten-Export (DSGVO Art. 20)",
          description: "Exportiert alle personenbezogenen Daten des authentifizierten Nutzers als JSON (DSGVO Datenportabilität).",
          security: [{ BearerAuth: [] }],
          responses: {
            "200": {
              description: "Vollständiger Datenexport",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      exported_at: { type: "string", format: "date-time" },
                      user: { type: "object" },
                      profil: { type: "object" },
                      anfragen: { type: "array" },
                      dokumente: { type: "array" },
                      nachrichten: { type: "array" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── System ────────────────────────────────────────────────────────────────
      "/api/health": {
        get: {
          tags: ["System"],
          summary: "Health-Check",
          description: "Prüft den Status aller Systemkomponenten: Datenbank, KI-API, Storage, E-Mail.",
          responses: {
            "200": {
              description: "System gesund",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["ok", "degraded", "down"] },
                      version: { type: "string" },
                      checks: {
                        type: "object",
                        properties: {
                          database: { type: "string" },
                          ai: { type: "string" },
                          storage: { type: "string" },
                          email: { type: "string" },
                        },
                      },
                      uptime_s: { type: "number" },
                    },
                  },
                },
              },
            },
            "503": { description: "System degraded oder down" },
          },
        },
      },

      "/api/autocomplete": {
        get: {
          tags: ["Anbieter"],
          summary: "Anbieter-Autocomplete",
          description: "Live-Autocomplete für Anbieter-Namen in der Suche.",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string", minLength: 2 },
            },
          ],
          responses: {
            "200": {
              description: "Vorschläge",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      suggestions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            ort: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/api/embed": {
        get: {
          tags: ["Anbieter"],
          summary: "Embeddable Widget",
          description: "Gibt ein einbettbares HTML-Widget für Anbieter-Suchanfragen zurück (für Partner-Websites).",
          parameters: [
            {
              name: "partner",
              in: "query",
              schema: { type: "string" },
              description: "White-Label Partner-Slug",
            },
            {
              name: "lebenslage",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "HTML-Widget",
              content: { "text/html": { schema: { type: "string" } } },
            },
          },
        },
      },

      "/api/unsubscribe": {
        get: {
          tags: ["Profil"],
          summary: "E-Mail-Abmeldung",
          description: "One-Click Abmeldung von E-Mail-Benachrichtigungen via signiertem Token (RFC 8058).",
          parameters: [
            {
              name: "token",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "typ",
              in: "query",
              schema: {
                type: "string",
                enum: ["anfragen", "nachrichten", "marketing", "alle"],
              },
            },
          ],
          responses: {
            "200": { description: "Abmeldung bestätigt" },
            "400": { description: "Ungültiger oder abgelaufener Token" },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Supabase JWT-Token",
        },
      },
      schemas: {
        AnspruchErgebnis: {
          type: "object",
          properties: {
            ansprueche: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  bezeichnung: { type: "string" },
                  betrag_monatlich: { type: "number" },
                  rechtsgrundlage: { type: "string" },
                  hinweis: { type: "string" },
                },
              },
            },
            gesamt_monatlich: { type: "number" },
            pflegegrad: { type: "integer" },
            berechnet_am: { type: "string", format: "date-time" },
          },
        },
        TraegerPruefungInput: {
          type: "object",
          required: ["pflegegrad", "lebenslage"],
          properties: {
            klienten_id: { type: "string", format: "uuid" },
            pflegegrad: { type: "integer", minimum: 0, maximum: 5 },
            lebenslage: { type: "string" },
            geburtsjahr: { type: "integer" },
            haushalt: { type: "object" },
          },
        },
        ChatMessage: {
          type: "object",
          required: ["role", "content"],
          properties: {
            role: { type: "string", enum: ["user", "assistant"] },
            content: { type: "string" },
          },
        },
        Nachricht: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            anfrage_id: { type: "string", format: "uuid" },
            absender_id: { type: "string", format: "uuid" },
            inhalt: { type: "string" },
            gelesen: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            request_id: { type: "string" },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Ungültige Anfrage",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unauthorized: {
          description: "Nicht authentifiziert",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Forbidden: {
          description: "Fehlende Berechtigung",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        RateLimited: {
          description: "Rate-Limit erreicht",
          headers: {
            "Retry-After": {
              schema: { type: "integer" },
              description: "Sekunden bis zum nächsten erlaubten Request",
            },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  };
}
