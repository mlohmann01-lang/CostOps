import type { RecommendationFinding, ResolutionStep } from "./explainability-types";

export function blockerType(reason: string): string {
  const upper = reason.toUpperCase();
  if (upper.includes("IDENTITY")) return "IDENTITY_CONFLICT";
  if (upper.includes("OWNER") || upper.includes("OWNERSHIP")) return "MISSING_OWNER";
  if (upper.includes("STALE") || upper.includes("FRESH")) return "STALE_SOURCE";
  if (upper.includes("USAGE")) return "MISSING_USAGE_EVIDENCE";
  if (upper.includes("POLICY")) return "POLICY_BLOCKED";
  if (upper.includes("ENTITLEMENT")) return "ENTITLEMENT_CONFLICT";
  if (upper.includes("TRUST") || upper.includes("EVIDENCE")) return "MISSING_USAGE_EVIDENCE";
  return "READINESS_BLOCKER";
}

export function isPolicyBlock(reason: string): boolean {
  return blockerType(reason) === "POLICY_BLOCKED";
}

export function resolutionForBlocker(type: string, unlockValue: number): ResolutionStep {
  const map: Record<string, { title: string; description: string; linkTarget: string }> = {
    IDENTITY_CONFLICT: { title: "Resolve identity match", description: "Resolve identity match in Data Trust or Connector Ops before execution can be considered safe.", linkTarget: "/data-trust?findingType=IDENTITY_CONFLICT" },
    MISSING_OWNER: { title: "Assign business owner or cost centre", description: "Assign a business owner or cost centre so approval routing and accountability are complete.", linkTarget: "/data-trust?findingType=MISSING_OWNER" },
    STALE_SOURCE: { title: "Refresh connector sync", description: "Refresh connector sync to replace stale source evidence.", linkTarget: "/connector-ops" },
    MISSING_USAGE_EVIDENCE: { title: "Run usage ingestion", description: "Run usage ingestion so utilisation evidence is complete.", linkTarget: "/connector-ops" },
    POLICY_BLOCKED: { title: "Review governance policy", description: "Review governance policy or request an exception; no automatic remediation is performed.", linkTarget: "/all/governance" },
    ENTITLEMENT_CONFLICT: { title: "Reconcile entitlement source", description: "Reconcile entitlement source records before approving execution.", linkTarget: "/data-trust?findingType=ENTITLEMENT_CONFLICT" },
    READINESS_BLOCKER: { title: "Review readiness blocker", description: "Review the readiness blocker and update missing evidence or governance metadata.", linkTarget: "/data-trust" },
  };
  const item = map[type] ?? map.READINESS_BLOCKER;
  return { blockerType: type, ...item, unlockValue, remediationOnly: true };
}

export function buildFindingsFromReasons(input: { recommendationId: string; reasons: string[]; unlockValue: number }): { trustFindings: RecommendationFinding[]; policyFindings: RecommendationFinding[]; resolutionSteps: ResolutionStep[] } {
  const trustFindings: RecommendationFinding[] = [];
  const policyFindings: RecommendationFinding[] = [];
  const steps = new Map<string, ResolutionStep>();
  for (const reason of Array.from(new Set(input.reasons.filter(Boolean)))) {
    const type = blockerType(reason);
    const finding: RecommendationFinding = {
      findingId: `rec:${input.recommendationId}:${type}`,
      findingType: type as RecommendationFinding["findingType"],
      severity: type === "POLICY_BLOCKED" || type === "IDENTITY_CONFLICT" ? "HIGH" : "MEDIUM",
      description: reason,
      affectedValue: input.unlockValue,
      status: "OPEN",
    };
    if (isPolicyBlock(reason)) policyFindings.push(finding);
    else trustFindings.push(finding);
    if (!steps.has(type)) steps.set(type, resolutionForBlocker(type, input.unlockValue));
  }
  return { trustFindings, policyFindings, resolutionSteps: Array.from(steps.values()) };
}
