export type ExecutiveRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ExecutiveActionType = "ASSIGN_OWNER" | "REVIEW_AI_POLICY" | "RENEGOTIATE_RENEWAL" | "CONSOLIDATE_VENDOR" | "RETIRE_UNUSED_TOOL" | "VALIDATE_DATA" | "GENERATE_EVIDENCE" | "EXECUTIVE_REVIEW" | "INVESTIGATE";
export type ExecutiveRiskDomain = "M365" | "SHADOW_IT" | "SAAS_RATIONALISATION" | "AI_GOVERNANCE" | "RENEWALS" | "OWNERSHIP";
export type EvidenceConfidence = "HIGH" | "MEDIUM" | "LOW";
export interface ExecutiveRiskItem { id:string; title:string; riskLevel:ExecutiveRiskLevel; riskScore:number; domain:ExecutiveRiskDomain; vendorName?:string; applicationName?:string; annualCostExposure?:number; potentialAnnualSavings?:number; daysToRenewal?:number; ownerMissing?:boolean; affectedUsers?:number; rationale:string; recommendedAction:ExecutiveActionType; evidenceRefs:string[]; }
export interface ExecutiveRiskSummary { portfolioRiskScore:number; criticalIssues:number; highRiskIssues:number; ownerlessSpend:number; renewalsAtRisk:number; aiGovernanceGaps:number; shadowITFindings:number; potentialAnnualSavings:number; evidenceConfidence:EvidenceConfidence; }
export interface ExecutiveDomainBreakdown { domain:ExecutiveRiskDomain; issueCount:number; criticalCount:number; highCount:number; exposedSpend:number; potentialSavings:number; }
export interface ExecutiveLeadershipAction { actionType:ExecutiveActionType; label:string; count:number; priority:ExecutiveRiskLevel; rationale:string; }
export interface ExecutiveRiskCommandCenterResult { summary:ExecutiveRiskSummary; topRisks:ExecutiveRiskItem[]; leadershipActions:ExecutiveLeadershipAction[]; domainBreakdown:ExecutiveDomainBreakdown[]; executiveNarrative:string; evidenceRefs:string[]; generatedAt:string; }
