import { normalizeOracleJavaSignal } from './oracle-java-signal-normalizer';
import { computeOracleJavaRiskConfidence } from './oracle-java-risk-confidence';
import { computeOracleJavaEvidenceQuality } from './oracle-java-evidence-quality-model';
import { computeOracleJavaContractEvidence } from './oracle-java-contract-evidence-model';
import { computeOracleJavaInfrastructureAttribution } from './oracle-java-infrastructure-attribution';
import { computeOracleJavaExecutiveExposure } from './oracle-java-executive-exposure-model';
import { classifyExposureBand } from './oracle-java-economic-exposure-model';
import { generateOracleJavaRecommendations } from './oracle-java-recommendation-engine';
import type { OracleJavaRiskOutput, OracleJavaSignal } from './oracle-java-types';

export const computeOracleJavaEconomicReport = (input: OracleJavaSignal): { signal: OracleJavaSignal; risk: OracleJavaRiskOutput; recommendations: string[]; boundaryPosture: 'APPROVAL_REQUIRED' } => {
  const signal = normalizeOracleJavaSignal(input);
  const confidenceScore = computeOracleJavaRiskConfidence(signal);
  const evidenceQuality = computeOracleJavaEvidenceQuality(signal);
  const contract = computeOracleJavaContractEvidence(signal);
  const infra = computeOracleJavaInfrastructureAttribution(signal);
  const executive = computeOracleJavaExecutiveExposure(signal);
  const riskScore = Number(((1 - confidenceScore) * 0.2 + infra.risk * 0.25 + signal.exposure.auditBackExposureRisk * 0.2 + signal.java.unsupportedRuntimeRisk * 0.2 + executive * 0.15).toFixed(4));
  const governanceClass = riskScore > 0.8 ? 'BLOCKED' : riskScore > 0.6 || signal.exposure.recurrenceRisk > 0.6 ? 'APPROVAL_REQUIRED' : riskScore > 0.35 ? 'RECOMMEND_ONLY' : 'READ_ONLY';
  const risk: OracleJavaRiskOutput = {
    riskScore,
    confidenceScore,
    exposureBand: classifyExposureBand(signal.exposure.estimatedMonthlyExposure),
    governanceClass,
    riskReasons: [...infra.reasons, ...(signal.java.unsupportedRuntimeRisk > 0.6 ? ['unsupported Java runtime exposure'] : []), ...(signal.java.employeeMetricExposure > 0.6 ? ['employee metric exposure materiality'] : [])],
    evidenceGaps: contract.evidenceGaps,
    recommendedReviewMode: governanceClass === 'READ_ONLY' ? 'READ_ONLY' : 'APPROVAL_REQUIRED',
  };
  return { signal, risk, recommendations: generateOracleJavaRecommendations(risk), boundaryPosture: 'APPROVAL_REQUIRED' };
};
