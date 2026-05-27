import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    api: "xcare Public API",
    version: "1.0.0",
    documentation: "https://xcare.app/developer",
    endpoints: {
      "GET /api/v1/status": "API health check",
      "GET /api/v1/pflegegrade": "Get Pflegegrad info",
      "GET /api/v1/anbieter": "Search care providers",
      "POST /api/v1/buchungen": "Create a booking",
    },
    rateLimit: "60 requests/minute",
    authentication: "Bearer token (API key from xcare dashboard)",
  });
}
