export type RenewalExposureLevel = "LOW_RENEWAL_RISK"|"MODERATE_RENEWAL_RISK"|"HIGH_RENEWAL_RISK"|"CRITICAL_RENEWAL_RISK";
export type MaturityBand = "INITIAL"|"DEVELOPING"|"MATURE"|"ADVANCED"|"HIGHLY_GOVERNED";

export type AdobePhaseCInput = {
  tenantId: string;
  projectedSavings: number; suppressedSavings: number; approvalRequiredSavings: number; needsEvidenceSavings: number; realizedSavings: number;
  inactiveOpportunities: number; rightsizingOpportunities: number; addonOpportunities: number; storageOpportunities: number; contractorCleanupOpportunities: number;
  duplicateIdentityFindings: number; governanceBlockers: number; workflowBacklog: number; suppressionRatio: number; trustDegradationRatio: number;
  driftRate: number; reversalRate: number; realizationRate: number;
  allAppsConcentrationRatio: number; highCostSkuExposureRatio: number; inactiveLicenseRatio: number; unknownOwnershipRatio: number;
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const band=(n:number):MaturityBand=> n>=90?"HIGHLY_GOVERNED":n>=75?"ADVANCED":n>=55?"MATURE":n>=35?"DEVELOPING":"INITIAL";

export function computeAdobeRenewalReadiness(i: AdobePhaseCInput){
  const projectedRecoverableSpend = i.projectedSavings + i.approvalRequiredSavings + i.needsEvidenceSavings;
  const trustRisk = clamp(i.trustDegradationRatio*100 + i.duplicateIdentityFindings*2);
  const governanceRisk = clamp(i.governanceBlockers*6 + i.suppressionRatio*40 + i.workflowBacklog*2);
  const driftRisk = clamp(i.driftRate*100);
  const reversalRisk = clamp(i.reversalRate*100);
  const realizationConfidence = clamp(i.realizationRate*100 - reversalRisk*0.3 - driftRisk*0.2);
  const renewalReadinessScore = clamp(100 - (trustRisk*0.2 + governanceRisk*0.35 + driftRisk*0.2 + reversalRisk*0.15 + i.workflowBacklog*0.5));
  const renewalExposureLevel: RenewalExposureLevel = renewalReadinessScore >= 75 ? "LOW_RENEWAL_RISK" : renewalReadinessScore >= 55 ? "MODERATE_RENEWAL_RISK" : renewalReadinessScore >= 35 ? "HIGH_RENEWAL_RISK" : "CRITICAL_RENEWAL_RISK";
  return { tenantId:i.tenantId, renewalExposureLevel, projectedSavings:i.projectedSavings, projectedRecoverableSpend, suppressedSavings:i.suppressedSavings, approvalRequiredSavings:i.approvalRequiredSavings, needsEvidenceSavings:i.needsEvidenceSavings, realizedSavings:i.realizedSavings, realizationConfidence, workflowReviewLoad:i.workflowBacklog, governanceRisk, trustRisk, driftRisk, reversalRisk, renewalReadinessScore };
}

export function computeAdobePortfolioGovernance(i: AdobePhaseCInput){
  return {
    concentrationRisk: clamp(i.allAppsConcentrationRatio*100 + i.highCostSkuExposureRatio*50),
    inactivityRisk: clamp(i.inactiveLicenseRatio*100 + i.rightsizingOpportunities),
    ownershipTrustRisk: clamp(i.unknownOwnershipRatio*100 + i.trustDegradationRatio*50),
    governanceFriction: clamp(i.workflowBacklog*3 + i.suppressionRatio*50),
    signals: [
      i.allAppsConcentrationRatio>0.5?"HIGH_ALL_APPS_CONCENTRATION":null,
      i.contractorCleanupOpportunities>10?"HIGH_CONTRACTOR_DRIFT":null,
      i.suppressionRatio>0.25?"HIGH_SUPPRESSION_RATIO":null,
      i.unknownOwnershipRatio>0.2?"HIGH_UNKNOWN_OWNERSHIP":null,
    ].filter(Boolean),
  };
}

export function computeAdobeDriftSignals(i: AdobePhaseCInput){
  const signals = [
    {driftCategory:"INACTIVE_LICENSE_GROWTH", growthRate:i.inactiveLicenseRatio, severity:i.inactiveLicenseRatio>0.3?"HIGH":"MEDIUM"},
    {driftCategory:"WORKFLOW_BACKLOG_GROWTH", growthRate:i.workflowBacklog/100, severity:i.workflowBacklog>20?"HIGH":"MEDIUM"},
    {driftCategory:"TRUST_DEGRADATION_TREND", growthRate:i.trustDegradationRatio, severity:i.trustDegradationRatio>0.25?"HIGH":"MEDIUM"},
    {driftCategory:"SUPPRESSION_GROWTH", growthRate:i.suppressionRatio, severity:i.suppressionRatio>0.25?"HIGH":"MEDIUM"},
  ];
  return signals.map((s,idx)=>({...s, confidence: clamp(60 + s.growthRate*40), correlationId:`adobe:drift:${i.tenantId}:${idx}`, traceId:`trace:adobe:drift:${i.tenantId}:${idx}`, supportingEvidence:{tenantId:i.tenantId}}));
}

export function computeAdobeOperationalMaturity(i: AdobePhaseCInput){
  const renewal = computeAdobeRenewalReadiness(i);
  const trustMaturity = clamp(100-renewal.trustRisk);
  const governanceMaturity = clamp(100-renewal.governanceRisk);
  const workflowMaturity = clamp(100-i.workflowBacklog*3);
  const telemetryMaturity = clamp(70 - i.suppressionRatio*20 + i.realizationRate*20);
  const replayMaturity = clamp(65 - i.driftRate*20 - i.reversalRate*20 + i.realizationRate*30);
  const score = clamp((trustMaturity+governanceMaturity+workflowMaturity+telemetryMaturity+replayMaturity)/5);
  return { score, band: band(score), dimensions: { trustMaturity, governanceMaturity, workflowMaturity, telemetryMaturity, replayMaturity, storageGovernanceMaturity: clamp(100-i.storageOpportunities*4), rightsizingMaturity: clamp(100-i.rightsizingOpportunities*3), contractorGovernanceMaturity: clamp(100-i.contractorCleanupOpportunities*3), renewalReadinessMaturity: renewal.renewalReadinessScore } };
}

export function generateAdobeExecutiveReport(i: AdobePhaseCInput){
  const renewal = computeAdobeRenewalReadiness(i);
  const maturity = computeAdobeOperationalMaturity(i);
  const drifts = computeAdobeDriftSignals(i);
  return { projectedRecoverableSpend: renewal.projectedRecoverableSpend, realizedSavings: renewal.realizedSavings, approvalRequiredSavings: renewal.approvalRequiredSavings, suppressedSavings: renewal.suppressedSavings, trustRisk: renewal.trustRisk, governanceRisk: renewal.governanceRisk, renewalExposure: renewal.renewalExposureLevel, workflowBacklog: i.workflowBacklog, operationalMaturityScore: maturity.score, topGovernanceDriftSignals: drifts.slice(0,3) };
}
