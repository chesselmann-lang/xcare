import { Inngest } from "inngest";

/**
 * Shared Inngest client — import this wherever you need to send events
 * or register functions. Single instance avoids duplicate client warnings.
 */
export const inngest = new Inngest({ id: "xcare" });
