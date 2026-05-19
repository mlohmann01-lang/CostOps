import type { OracleJavaSignal } from './oracle-java-types';

export const computeOracleJavaContractEvidence = (signal: OracleJavaSignal): { confidence: number; evidenceGaps: string[] } => {
  const gaps: string[] = [];
  if (signal.entitlement.contractEvidenceConfidence < 0.6) gaps.push('contract evidence confidence gap');
  if (signal.entitlement.entitlementCoverageRatio < 0.7) gaps.push('entitlement coverage ambiguity');
  if (signal.entitlement.auditEvidenceCompleteness < 0.7) gaps.push('audit evidence completeness gap');
  return {
    confidence: Number(((signal.entitlement.contractEvidenceConfidence + signal.entitlement.auditEvidenceCompleteness) / 2).toFixed(4)),
    evidenceGaps: gaps,
  };
};
