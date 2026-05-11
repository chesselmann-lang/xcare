import { NextResponse } from "next/server";

/**
 * GET /api/docs/ui
 *
 * Serves a Swagger UI page for interactive API exploration.
 * Loads swagger-ui from unpkg CDN — no npm package required.
 *
 * Access: Public (the spec itself contains auth requirements per endpoint).
 */
export function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>xcare API Dokumentation</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f8fafc; }
    #swagger-ui .topbar { background: #2563eb; }
    #swagger-ui .topbar .download-url-wrapper { display: none; }
    .custom-header {
      background: #2563eb;
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: system-ui, sans-serif;
    }
    .custom-header h1 { margin: 0; font-size: 1.25rem; font-weight: 700; }
    .custom-header p { margin: 0; font-size: 0.8rem; opacity: 0.8; }
    .header-badge {
      background: rgba(255,255,255,0.2);
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="custom-header">
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <h1>xcare API</h1>
        <span class="header-badge">v3.0.0</span>
      </div>
      <p>Pflege-Ökosystem REST API · OpenAPI 3.1</p>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${baseUrl}/api/docs",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset,
        ],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        persistAuthorization: true,
        onComplete: function() {
          // Auto-set server to current origin
          const serverInput = document.querySelector('.servers select');
          if (serverInput) {
            const opts = serverInput.options;
            for (let i = 0; i < opts.length; i++) {
              if (opts[i].value.includes('localhost')) {
                serverInput.selectedIndex = i;
                break;
              }
            }
          }
        }
      });
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      // CSP is permissive here since this is a dev tool page (unpkg CDN needed)
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data:; font-src 'self' https://unpkg.com",
    },
  });
}
