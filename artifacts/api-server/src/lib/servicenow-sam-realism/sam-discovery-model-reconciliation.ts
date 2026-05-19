import type { SamSignal } from "./servicenow-sam-types"; export const samDiscoveryReconciliation=(s:SamSignal)=>({governanceReview:true,readiness:(s.softwareModel&&s.entitlementEvidence&&s.usageEvidence)?"REVIEW_ONLY":"NOT_READY",proof:"evidence-linked",simulation:true});
export const samDiscoveryModelReconciliation = samDiscoveryReconciliation;
