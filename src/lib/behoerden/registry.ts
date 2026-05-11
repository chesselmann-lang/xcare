/**
 * Behördenschnittstellen-Registry
 * Alle 8 Priority-1 Adapter registriert und exportiert.
 */
import { BaPortalAdapter } from "./adapters/ba-portal";
import { DrvAdapter } from "./adapters/drv";
import { PflegekasseAdapter } from "./adapters/pflegekasse";
import { BzrAdapter } from "./adapters/bzr";
import { KfwAdapter } from "./adapters/kfw";
import { JobcenterAdapter } from "./adapters/jobcenter";
import { FamilienkasseAdapter } from "./adapters/familienkasse";
import { SozialamtAdapter } from "./adapters/sozialamt";
import type { BehoerdenAdapter } from "./adapter-base";

export const BEHOERDEN_ADAPTER: Record<string, BehoerdenAdapter> = {
  "ba-portal": new BaPortalAdapter(),
  "drv": new DrvAdapter(),
  "pflegekasse": new PflegekasseAdapter(),
  "bzr": new BzrAdapter(),
  "kfw": new KfwAdapter(),
  "jobcenter": new JobcenterAdapter(),
  "familienkasse": new FamilienkasseAdapter(),
  "sozialamt": new SozialamtAdapter(),
};

export type BehoerdeKey = keyof typeof BEHOERDEN_ADAPTER;

export function getAdapter(key: string): BehoerdenAdapter | undefined {
  return BEHOERDEN_ADAPTER[key];
}
