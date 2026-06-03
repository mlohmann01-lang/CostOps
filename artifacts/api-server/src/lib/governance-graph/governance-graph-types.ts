export type GovernanceGraphNodeType = "VENDOR" | "APPLICATION" | "OWNER" | "COST" | "RENEWAL" | "FINDING" | "RISK" | "OPPORTUNITY" | "EVIDENCE" | "DOMAIN";
export type GovernanceGraphEdgeType = "OWNS_APPLICATION" | "HAS_OWNER" | "HAS_COST" | "HAS_RENEWAL" | "HAS_FINDING" | "HAS_RISK" | "HAS_OPPORTUNITY" | "SUPPORTED_BY_EVIDENCE" | "SOURCED_FROM_DOMAIN" | "DUPLICATES" | "OVERLAPS_WITH" | "BLOCKED_BY" | "REQUIRES_ACTION";
export type GovernanceGraphDomain = "M365_OPTIMISATION" | "SHADOW_IT" | "SAAS_RATIONALISATION" | "AI_GOVERNANCE" | "RENEWALS" | "OWNERSHIP" | "EVIDENCE" | "EXECUTIVE_VALUE";
export type GovernanceGraphRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface GovernanceGraphNode { id:string; type:GovernanceGraphNodeType; label:string; domain?:GovernanceGraphDomain; riskLevel?:GovernanceGraphRiskLevel; annualCost?:number; potentialAnnualSavings?:number; metadata?:Record<string, unknown>; }
export interface GovernanceGraphEdge { id:string; sourceId:string; targetId:string; type:GovernanceGraphEdgeType; label:string; weight?:number; metadata?:Record<string, unknown>; }
export interface GovernanceGraphSummary { vendors:number; applications:number; owners:number; findings:number; risks:number; opportunities:number; evidenceItems:number; ownerlessApplications:number; highRiskApplications:number; annualCostMapped:number; potentialAnnualSavingsMapped:number; domainsRepresented:GovernanceGraphDomain[]; }
export type GovernanceGraphInsightType = "OWNERLESS_HIGH_SPEND" | "MULTI_DOMAIN_RISK" | "DUPLICATE_CAPABILITY_CLUSTER" | "AI_GOVERNANCE_CLUSTER" | "RENEWAL_RISK_CLUSTER" | "EVIDENCE_GAP" | "HIGH_VALUE_OPPORTUNITY";
export interface GovernanceGraphInsight { id:string; type:GovernanceGraphInsightType; title:string; severity:GovernanceGraphRiskLevel; relatedNodeIds:string[]; rationale:string; recommendedAction:string; evidenceRefs:string[]; }
export interface GovernanceGraphResult { nodes:GovernanceGraphNode[]; edges:GovernanceGraphEdge[]; summary:GovernanceGraphSummary; insights:GovernanceGraphInsight[]; generatedAt:string; }

export interface GovernanceGraphFindingInput { id:string; sourceDomain:GovernanceGraphDomain; title:string; riskLevel:GovernanceGraphRiskLevel; potentialAnnualSavings?:number; evidenceRefs?:string[]; renewalDays?:number; duplicateWith?:string[]; overlapWith?:string[]; hasEvidence?:boolean; }
export interface GovernanceGraphApplicationInput { vendorName:string; applicationName:string; ownerName?:string; annualCost?:number; renewalDate?:string; domains:GovernanceGraphDomain[]; duplicateWith?:string[]; overlapWith?:string[]; findings?:GovernanceGraphFindingInput[]; evidenceRefs?:string[]; }
export interface GovernanceGraphInput { generatedAt?:string; applications:GovernanceGraphApplicationInput[]; }
