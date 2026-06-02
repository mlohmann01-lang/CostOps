export type EvidencePackScope = 'TENANT' | 'OPPORTUNITY' | 'APPROVAL' | 'EXECUTION' | 'OUTCOME' | 'DRIFT'
export type EvidencePackStatus = 'GENERATING' | 'COMPLETE' | 'FAILED'
export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type EvidenceSectionType = 'EXECUTIVE_SUMMARY' | 'DISCOVERY' | 'TRUST' | 'OPPORTUNITY' | 'APPROVAL' | 'EXECUTION' | 'VERIFICATION' | 'OUTCOME' | 'DRIFT'

export interface EvidencePackSummary { projectedSavings: number; approvedSavings: number; executedSavings: number; verifiedSavings: number; protectedSavings: number; trustScore: number; connectorCoverage: number; opportunities: number; approvals: number; executions: number; verificationRate: number; driftStatus: string }
export interface EvidencePackMetrics { completeness: number; confidence: Record<string, EvidenceConfidence>; counts: Record<string, number> }
export interface EvidencePackSection { sectionId: string; title: string; type: EvidenceSectionType; summary: string; evidenceRefs: string[]; metrics: Record<string, unknown>; findings: Array<Record<string, unknown>> }
export interface EvidencePack { evidencePackId: string; tenantId: string; generatedAt: string; generatedBy?: string; scope: EvidencePackScope; status: EvidencePackStatus; summary: EvidencePackSummary; sections: EvidencePackSection[]; metrics: EvidencePackMetrics; evidenceRefs: string[]; warnings: string[]; blockers: string[] }
export interface EvidencePackGenerateInput { tenantId: string; scope?: EvidencePackScope; targetId?: string; generatedBy?: string }
export interface EvidencePackAuditBundle { pack: EvidencePack; evidence: EvidencePackSection[]; events: unknown[]; trust: unknown; outcomes: unknown }
