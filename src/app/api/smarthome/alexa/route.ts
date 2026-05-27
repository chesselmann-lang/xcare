import { NextRequest, NextResponse } from "next/server";

// Alexa Smart Home Skill Lambda-style handler
// Full implementation requires AWS Lambda + Alexa Skills Kit
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { directive } = body;

  const namespace = directive?.header?.namespace;
  const name = directive?.header?.name;

  // Handle Alexa.Discovery
  if (namespace === "Alexa.Discovery" && name === "Discover") {
    return NextResponse.json({
      event: {
        header: {
          namespace: "Alexa.Discovery",
          name: "Discover.Response",
          payloadVersion: "3",
          messageId: crypto.randomUUID(),
        },
        payload: {
          endpoints: [
            {
              endpointId: "xcare-notfall-button",
              friendlyName: "xcare Notfallknopf",
              description: "xcare Pflegeassistent Notfallknopf",
              manufacturerName: "xcare",
              displayCategories: ["OTHER"],
              capabilities: [
                { type: "AlexaInterface", interface: "Alexa", version: "3" },
                {
                  type: "AlexaInterface",
                  interface: "Alexa.PowerController",
                  version: "3",
                  properties: {
                    supported: [{ name: "powerState" }],
                    proactivelyReported: false,
                    retrievable: true,
                  },
                },
              ],
            },
          ],
        },
      },
    });
  }

  // Handle PowerController (trigger emergency)
  if (namespace === "Alexa.PowerController" && name === "TurnOn") {
    // TODO: trigger emergency notification
    return NextResponse.json({
      event: {
        header: {
          namespace: "Alexa",
          name: "Response",
          payloadVersion: "3",
          messageId: crypto.randomUUID(),
          correlationToken: directive?.header?.correlationToken,
        },
        endpoint: directive?.endpoint,
        payload: {},
      },
      context: {
        properties: [
          {
            namespace: "Alexa.PowerController",
            name: "powerState",
            value: "ON",
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 0,
          },
        ],
      },
    });
  }

  return NextResponse.json({ error: "Unhandled directive" }, { status: 400 });
}
