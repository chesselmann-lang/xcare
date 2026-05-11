/**
 * Feature Gate System — centralized enforcement of plan-based access control.
 *
 * Usage (server-side):
 *   const gate = planFeatureGate(anbieter.plan);
 *   if (!gate.canExportCsv) return new NextResponse("Upgrade required", { status: 403 });
 *
 * Usage (client):
 *   import { PLAN_FEATURES } from "@/lib/stripe/features";
 *   const features = PLAN_FEATURES[plan ?? "free"];
 */

import type { PlanId } from "./plans";

export interface PlanFeatures {
  /** Max team members (including owner). null = unlimited */
  maxTeamMembers: number | null;
  /** Can export anfragen as CSV */
  canExportCsv: boolean;
  /** Can view statistiken / analytics dashboard */
  canViewStatistiken: boolean;
  /** Can use advanced Anbieter-Profil features (gallery, completion score) */
  canUseAdvancedProfil: boolean;
  /** Can use CRM features (Notizen, Tags, Wiedervorlagen) */
  canUseCrm: boolean;
  /** Label for upgrade prompt */
  requiredPlanLabel: string;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    maxTeamMembers: 1,
    canExportCsv: false,
    canViewStatistiken: false,
    canUseAdvancedProfil: false,
    canUseCrm: false,
    requiredPlanLabel: "Starter oder höher",
  },
  starter: {
    maxTeamMembers: 3,
    canExportCsv: true,
    canViewStatistiken: true,
    canUseAdvancedProfil: true,
    canUseCrm: true,
    requiredPlanLabel: "Professional",
  },
  professional: {
    maxTeamMembers: null, // unlimited
    canExportCsv: true,
    canViewStatistiken: true,
    canUseAdvancedProfil: true,
    canUseCrm: true,
    requiredPlanLabel: "",
  },
  enterprise: {
    maxTeamMembers: null,
    canExportCsv: true,
    canViewStatistiken: true,
    canUseAdvancedProfil: true,
    canUseCrm: true,
    requiredPlanLabel: "",
  },
};

/**
 * Returns the feature gate for a given plan ID.
 * Defaults to "free" if the plan is unknown/null.
 */
export function planFeatureGate(plan: string | null | undefined): PlanFeatures {
  const id = (plan ?? "free") as PlanId;
  return PLAN_FEATURES[id] ?? PLAN_FEATURES.free;
}

/**
 * Checks whether a team can add a new member given the current count.
 */
export function canAddTeamMember(plan: string | null | undefined, currentCount: number): boolean {
  const gate = planFeatureGate(plan);
  if (gate.maxTeamMembers === null) return true;
  return currentCount < gate.maxTeamMembers;
}
