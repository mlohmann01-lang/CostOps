import type { AdobeNormalizedEvidence } from "./types";

export type AdobeReconciliationFinding = {
  tenantId: string; entityId: string; findingType: string; severity: "INFO"|"WARNING"|"BLOCKER"|"CRITICAL_BLOCKER";
  trustImpact: "NONE"|"LOW"|"MEDIUM"|"HIGH"; requiresReview: boolean; blocksRecommendation: boolean; suppressionBehavior: "NONE"|"NEEDS_EVIDENCE"|"NEEDS_TRUST_REVIEW"|"GOVERNANCE_REVIEW_REQUIRED"|"SUPPRESS";
  evidence: Record<string, unknown>; correlationId: string; traceId: string; createdAt: string;
};

export function buildAdobeReconciliationFindings(e: AdobeNormalizedEvidence & { contractorState?: string; costCenter?: string|null; addOnUsageKnown?: boolean; storageKnown?: boolean; isSharedDevice?: boolean; duplicateIdentity?: boolean; isAdmin?: boolean; inactiveDays?: number; hasEntitlementConflict?: boolean; }): AdobeReconciliationFinding[] {
  const now = new Date().toISOString();
  const correlationId = `adobe:recon:${e.user.email}`;
  const traceId = `trace:${e.user.email}`;
  const f: AdobeReconciliationFinding[] = [];
  const push=(findingType:string,severity:AdobeReconciliationFinding['severity'],suppressionBehavior:AdobeReconciliationFinding['suppressionBehavior'],evidence:Record<string,unknown>,blocks=false)=>f.push({tenantId:e.tenantId,entityId:e.user.email,findingType,severity,trustImpact:severity==="CRITICAL_BLOCKER"?"HIGH":severity==="BLOCKER"?"MEDIUM":"LOW",requiresReview:suppressionBehavior!=="NONE",blocksRecommendation:blocks,suppressionBehavior,evidence,correlationId,traceId,createdAt:now});
  if (e.duplicateIdentity) push("ADOBE_DUPLICATE_IDENTITY","BLOCKER","NEEDS_TRUST_REVIEW",{identityType:e.user.identityType},true);
  if ((e.inactiveDays ?? 0) > 90 && e.license.assignedProducts.length>0) push("ADOBE_INACTIVE_LICENSED_USER","WARNING","NONE",{inactiveDays:e.inactiveDays});
  if (e.user.contractorFlag && e.contractorState === "INACTIVE" && e.license.assignedProducts.length>0) push("ADOBE_CONTRACTOR_DRIFT","BLOCKER","GOVERNANCE_REVIEW_REQUIRED",{contractorState:e.contractorState},true);
  if (e.account.owner === "UNKNOWN_OWNER" || !e.costCenter) push("ADOBE_COST_ATTRIBUTION_GAP","BLOCKER","GOVERNANCE_REVIEW_REQUIRED",{owner:e.account.owner,costCenter:e.costCenter},true);
  if (e.hasEntitlementConflict) push("ADOBE_ENTITLEMENT_CONFLICT","BLOCKER","NEEDS_TRUST_REVIEW",{assigned:e.license.assignedProducts},true);
  if (e.usageSignal.usageConfidence === "UNKNOWN_USAGE_CONFIDENCE") push("ADOBE_USAGE_EVIDENCE_MISSING","WARNING","NEEDS_EVIDENCE",{usageConfidence:e.usageSignal.usageConfidence});
  if (e.isSharedDevice) push("ADOBE_SHARED_DEVICE_AMBIGUOUS","WARNING","GOVERNANCE_REVIEW_REQUIRED",{sharedDevice:true});
  if (e.isAdmin) push("ADOBE_ADMIN_ROLE_EXCLUSION","CRITICAL_BLOCKER","SUPPRESS",{adminRole:true},true);
  if (!e.storageKnown) push("ADOBE_STORAGE_EVIDENCE_MISSING","WARNING","NEEDS_EVIDENCE",{storageKnown:false});
  if (!e.addOnUsageKnown) push("ADOBE_ADDON_USAGE_UNKNOWN","WARNING","NEEDS_EVIDENCE",{addOnUsageKnown:false});
  return f;
}
