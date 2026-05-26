import type { DiscoveryLifecycleState } from "./types";

export type ReliabilityBand = "LOW" | "MEDIUM" | "HIGH";
export type FreshnessStatus = "FRESH" | "STALE";

export type DiscoveryReliabilityMetadata = {
  sourceSystem: string;
  sourceReference: string;
  observedAt: string;
  ingestedAt: string;
  freshnessStatus: FreshnessStatus;
  confidenceScore: number;
  reliabilityBand: ReliabilityBand;
  lifecycleState: DiscoveryLifecycleState;
  lifecycleReason: string;
  validationWarnings: string[];
  validationErrors: string[];
};

const allowed: Record<DiscoveryLifecycleState, DiscoveryLifecycleState[]> = {
  DISCOVERED: ["NORMALIZED", "UNRESOLVED", "CONFLICTED", "STALE"],
  NORMALIZED: ["MATCHED", "UNRESOLVED", "CONFLICTED", "STALE"],
  MATCHED: ["TRUSTED", "CONFLICTED", "STALE"],
  CONFLICTED: ["UNRESOLVED", "STALE"],
  UNRESOLVED: ["MATCHED", "CONFLICTED", "STALE"],
  TRUSTED: ["STALE", "CONFLICTED"],
  STALE: ["DISCOVERED", "NORMALIZED", "UNRESOLVED", "CONFLICTED"],
};

export function classifyReliability(confidenceScore: number): ReliabilityBand {
  if (confidenceScore >= 0.85) return "HIGH";
  if (confidenceScore >= 0.6) return "MEDIUM";
  return "LOW";
}

export function freshnessFromObservedAt(observedAt: string, staleAfterHours = 24 * 30): FreshnessStatus {
  return Date.now() - new Date(observedAt).getTime() > staleAfterHours * 60 * 60 * 1000 ? "STALE" : "FRESH";
}

export function transitionLifecycle(params: {
  current: DiscoveryLifecycleState;
  target: DiscoveryLifecycleState;
  hasConflictResolutionEvidence?: boolean;
  hasRefreshedEvidence?: boolean;
  hasMatchingEvidence?: boolean;
}): { ok: boolean; reason: string } {
  const { current, target } = params;
  if (!allowed[current].includes(target)) return { ok: false, reason: `INVALID_TRANSITION:${current}->${target}` };
  if (current === "DISCOVERED" && target === "TRUSTED") return { ok: false, reason: "MUST_PROGRESS_VIA_NORMALIZED_MATCHED" };
  if (current === "CONFLICTED" && target === "TRUSTED" && !params.hasConflictResolutionEvidence) return { ok: false, reason: "CONFLICT_RESOLUTION_EVIDENCE_REQUIRED" };
  if (current === "STALE" && target === "TRUSTED" && !params.hasRefreshedEvidence) return { ok: false, reason: "REFRESHED_EVIDENCE_REQUIRED" };
  if (current === "UNRESOLVED" && target === "MATCHED" && !params.hasMatchingEvidence) return { ok: false, reason: "MATCHING_EVIDENCE_REQUIRED" };
  return { ok: true, reason: "OK" };
}
