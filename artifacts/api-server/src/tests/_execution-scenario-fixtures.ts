import type { ExecutionEligibilityInput } from '../lib/execution-eligibility/execution-eligibility-types';

export const executionScenarios: Record<string, ExecutionEligibilityInput> = {
  m365LowRiskReclaim: {
    evidenceIntegrity: 92, lineageIntegrity: 95, governanceCertification: 90, blastRadius: 'LOCALIZED', reversibility: 'FULLY_REVERSIBLE', recurrenceRisk: 20, businessCriticality: 20, auditExposure: 15, volatilityRisk: 10, executiveMateriality: 10, contradictionSeverity: 'NONE', policyIntegrity: 95
  },
  saasDowngradeMediumRisk: {
    evidenceIntegrity: 80, lineageIntegrity: 85, governanceCertification: 80, blastRadius: 'BUSINESS_UNIT_SCOPE', reversibility: 'CONDITIONALLY_REVERSIBLE', recurrenceRisk: 35, businessCriticality: 45, auditExposure: 40, volatilityRisk: 30, executiveMateriality: 72, contradictionSeverity: 'LOW', policyIntegrity: 85
  },
  cloudSandboxStop: {
    evidenceIntegrity: 85, lineageIntegrity: 88, governanceCertification: 82, blastRadius: 'TEAM_SCOPE', reversibility: 'FULLY_REVERSIBLE', recurrenceRisk: 30, businessCriticality: 35, auditExposure: 25, volatilityRisk: 20, executiveMateriality: 30, contradictionSeverity: 'NONE', policyIntegrity: 84
  },
  k8sProdRightsize: {
    evidenceIntegrity: 78, lineageIntegrity: 82, governanceCertification: 78, blastRadius: 'ENTERPRISE_SCOPE', reversibility: 'LOW_CONFIDENCE_REVERSIBLE', recurrenceRisk: 48, businessCriticality: 65, auditExposure: 60, volatilityRisk: 62, executiveMateriality: 68, contradictionSeverity: 'LOW', policyIntegrity: 80
  },
  oracleAuditExposure: {
    evidenceIntegrity: 72, lineageIntegrity: 70, governanceCertification: 74, blastRadius: 'BUSINESS_UNIT_SCOPE', reversibility: 'LOW_CONFIDENCE_REVERSIBLE', recurrenceRisk: 55, businessCriticality: 70, auditExposure: 85, volatilityRisk: 45, executiveMateriality: 75, contradictionSeverity: 'MEDIUM', policyIntegrity: 76
  },
  aiRuntimeTierReview: {
    evidenceIntegrity: 84, lineageIntegrity: 86, governanceCertification: 82, blastRadius: 'TEAM_SCOPE', reversibility: 'CONDITIONALLY_REVERSIBLE', recurrenceRisk: 32, businessCriticality: 38, auditExposure: 22, volatilityRisk: 42, executiveMateriality: 40, contradictionSeverity: 'NONE', policyIntegrity: 82
  },
  highBlastCommitment: {
    evidenceIntegrity: 88, lineageIntegrity: 90, governanceCertification: 88, blastRadius: 'CRITICAL_PLATFORM_SCOPE', reversibility: 'CONDITIONALLY_REVERSIBLE', recurrenceRisk: 45, businessCriticality: 80, auditExposure: 70, volatilityRisk: 74, executiveMateriality: 78, contradictionSeverity: 'LOW', policyIntegrity: 88
  },
  nonReversibleDb: {
    evidenceIntegrity: 90, lineageIntegrity: 92, governanceCertification: 90, blastRadius: 'BUSINESS_UNIT_SCOPE', reversibility: 'NON_REVERSIBLE', recurrenceRisk: 40, businessCriticality: 80, auditExposure: 90, volatilityRisk: 50, executiveMateriality: 80, contradictionSeverity: 'LOW', policyIntegrity: 88
  },
  missingLineage: {
    evidenceIntegrity: 85, lineageIntegrity: 0, governanceCertification: 82, blastRadius: 'TEAM_SCOPE', reversibility: 'FULLY_REVERSIBLE', recurrenceRisk: 30, businessCriticality: 30, auditExposure: 30, volatilityRisk: 30, executiveMateriality: 25, contradictionSeverity: 'NONE', policyIntegrity: 80
  },
  criticalContradiction: {
    evidenceIntegrity: 85, lineageIntegrity: 90, governanceCertification: 85, blastRadius: 'LOCALIZED', reversibility: 'FULLY_REVERSIBLE', recurrenceRisk: 25, businessCriticality: 30, auditExposure: 20, volatilityRisk: 20, executiveMateriality: 20, contradictionSeverity: 'CRITICAL', policyIntegrity: 85
  }
};
