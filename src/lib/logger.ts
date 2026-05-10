/**
 * Structured logger for server-side code.
 *
 * - In production: outputs newline-delimited JSON (parseable by Vercel log drain,
 *   Datadog, Logtail, etc.)
 * - In development: outputs colourised human-readable lines.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Anfrage created", { anbieter_id, familie_id });
 *   logger.warn("Rate limit hit", { ip, path });
 *   logger.error("DB query failed", { error: err.message, path: "/api/bewertungen" });
 */

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === "production";

const LEVEL_NUM: Record<Level, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

// Only log debug messages if explicitly enabled
const MIN_LEVEL: Level = process.env.LOG_LEVEL as Level ?? (IS_PROD ? "info" : "debug");

const COLOURS: Record<Level, string> = {
  debug: "\x1b[90m",   // grey
  info:  "\x1b[36m",   // cyan
  warn:  "\x1b[33m",   // yellow
  error: "\x1b[31m",   // red
};
const RESET = "\x1b[0m";

function log(level: Level, message: string, context?: Context) {
  if (LEVEL_NUM[level] < LEVEL_NUM[MIN_LEVEL]) return;

  if (IS_PROD) {
    // Newline-delimited JSON — parseable by any log aggregator
    const entry = {
      ts:      new Date().toISOString(),
      level,
      message,
      ...context,
    };
    // Use the native console method that matches severity so Vercel routes it correctly
    if (level === "error") {
      console.error(JSON.stringify(entry));
    } else if (level === "warn") {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  } else {
    const ts    = new Date().toTimeString().slice(0, 8);
    const label = `${COLOURS[level]}[${level.toUpperCase().padEnd(5)}]${RESET}`;
    const ctx   = context && Object.keys(context).length > 0
      ? " " + JSON.stringify(context)
      : "";
    const line  = `${ts} ${label} ${message}${ctx}`;
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

export const logger = {
  debug: (message: string, context?: Context) => log("debug", message, context),
  info:  (message: string, context?: Context) => log("info",  message, context),
  warn:  (message: string, context?: Context) => log("warn",  message, context),
  error: (message: string, context?: Context) => log("error", message, context),
};

/**
 * Wraps a Next.js API route handler with:
 * - Request duration logging
 * - Structured error logging on unhandled rejections
 *
 * Usage:
 *   export const POST = withRequestLogging(async (req) => { ... });
 */
export function withRequestLogging<T>(
  handler: (request: Request) => Promise<T>,
  options?: { label?: string }
): (request: Request) => Promise<T> {
  return async (request: Request) => {
    const start = Date.now();
    const url   = new URL(request.url);
    const path  = url.pathname;
    const method = request.method;
    const label = options?.label ?? path;

    try {
      const result = await handler(request);
      const duration_ms = Date.now() - start;
      logger.info(`${method} ${label}`, { path, method, duration_ms });
      return result;
    } catch (err) {
      const duration_ms = Date.now() - start;
      logger.error(`${method} ${label} unhandled error`, {
        path,
        method,
        duration_ms,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n")[1]?.trim() : undefined,
      });
      throw err; // re-throw so Next.js returns a 500
    }
  };
}
