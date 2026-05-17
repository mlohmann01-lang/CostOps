export type RenewalExposureLevel = "LOW_RENEWAL_RISK"|"MODERATE_RENEWAL_RISK"|"HIGH_RENEWAL_RISK"|"CRITICAL_RENEWAL_RISK";
export type MaturityBand = "INITIAL"|"DEVELOPING"|"MATURE"|"ADVANCED"|"HIGHLY_GOVERNED";

export type AtlassianPhaseCInput = {
  tenantId: string;
  inactiveReclaimOpportunities: number; marketplaceRationalizationOpportunities: number; workspaceConsolidationOpportunities: number;
  adminConcentrationRisks: number; permissionTopologyRisks: number; governanceBacklog: number; suppressedRecommendations: number;
  trustDegradationRatio: number; workflowLoad: number; driftTrend: number; realizedGovernanceOutcomes: number; reversalRate: number; driftRate: number;
  projectedSavings: number; suppressedSavings: number; approvalRequiredSavings: number; realizedSavings: number;
  workspaceSprawlRatio: number; inactiveWorkspaceRatio: number; marketplaceSprawlRatio: number; highRiskAdminExposureRatio: number;
  permissionConflictRatio: number; orphanedOwnershipRatio: number; suppressionRatio: number; workflowBacklog: number; governanceDriftRatio: number;
  realizationRate: number; approvalConversionRate: number; workflowCompletionRate: number;
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const band=(n:number):MaturityBand=> n>=90?"HIGHLY_GOVERNED":n>=75?"ADVANCED":n>=55?"MATURE":n>=35?"DEVELOPING":"INITIAL";

export function computeAtlassianRenewalReadiness(i: AtlassianPhaseCInput){
  const projectedRecoverableSpend = i.projectedSavings + i.approvalRequiredSavings;
  const suppressedRecoverableSpend = i.suppressedSavings;
  const governanceRisk = clamp(i.governanceBacklog*4 + i.workflowLoad*2 + i.suppressionRatio*40 + i.permissionTopologyRisks*3);
  const trustRisk = clamp(i.trustDegradationRatio*100);
  const adminRisk = clamp(i.adminConcentrationRisks*8 + i.highRiskAdminExposureRatio*80);
  const workspaceEntropyRisk = clamp(i.workspaceSprawlRatio*100 + i.inactiveWorkspaceRatio*80 + i.workspaceConsolidationOpportunities*2);
  const marketplaceRisk = clamp(i.marketplaceSprawlRatio*100 + i.marketplaceRationalizationOpportunities*3);
  const realizationConfidence = clamp(i.realizationRate*100 - i.reversalRate*30 - i.driftRate*20);
  const renewalReadinessScore = clamp(100 - (governanceRisk*0.25 + trustRisk*0.2 + adminRisk*0.2 + workspaceEntropyRisk*0.15 + marketplaceRisk*0.1 + i.workflowBacklog*0.4));
  const renewalExposureLevel: RenewalExposureLevel = renewalReadinessScore>=75?"LOW_RENEWAL_RISK":renewalReadinessScore>=55?"MODERATE_RENEWAL_RISK":renewalReadinessScore>=35?"HIGH_RENEWAL_RISK":"CRITICAL_RENEWAL_RISK";
  return { tenantId:i.tenantId, renewalExposureLevel, projectedRecoverableSpend, suppressedRecoverableSpend, approvalRequiredSavings:i.approvalRequiredSavings, realizedSavings:i.realizedSavings, governanceRisk, trustRisk, adminRisk, workspaceEntropyRisk, marketplaceRisk, workflowReviewLoad:i.workflowLoad, renewalReadinessScore, realizationConfidence };
}

export function computeAtlassianPortfolioGovernance(i: AtlassianPhaseCInput){
  return {
    workspaceSprawl:i.workspaceSprawlRatio,
    inactiveWorkspaceRatio:i.inactiveWorkspaceRatio,
    marketplaceSprawl:i.marketplaceSprawlRatio,
    highRiskAdminExposure:i.highRiskAdminExposureRatio,
    permissionTopologyConflictRatio:i.permissionConflictRatio,
    orphanedOwnershipRatio:i.orphanedOwnershipRatio,
    suppressionRatio:i.suppressionRatio,
    workflowBacklog:i.workflowBacklog,
    trustDegradationRatio:i.trustDegradationRatio,
    governanceDriftRatio:i.governanceDriftRatio,
    governanceSignals:[
      i.highRiskAdminExposureRatio>0.25?"HIGH_ADMIN_CONCENTRATION":null,
      i.marketplaceSprawlRatio>0.3?"HIGH_MARKETPLACE_OVERLAP":null,
      i.orphanedOwnershipRatio>0.2?"HIGH_ORPHANED_OWNERSHIP":null,
      i.suppressionRatio>0.25?"HIGH_SUPPRESSION_RATIO":null,
    ].filter(Boolean),
  };
}

export function computeAtlassianDriftSignals(i: AtlassianPhaseCInput){
  const signals = [
    { driftCategory:"WORKSPACE_SPRAWL_GROWTH", severity:i.workspaceSprawlRatio>0.3?"HIGH":"MEDIUM", growthRate:i.workspaceSprawlRatio },
    { driftCategory:"MARKETPLACE_SPRAWL_GROWTH", severity:i.marketplaceSprawlRatio>0.3?"HIGH":"MEDIUM", growthRate:i.marketplaceSprawlRatio },
    { driftCategory:"WORKFLOW_BACKLOG_GROWTH", severity:i.workflowBacklog>20?"HIGH":"MEDIUM", growthRate:i.workflowBacklog/100 },
    { driftCategory:"TRUST_DEGRADATION_TREND", severity:i.trustDegradationRatio>0.25?"HIGH":"MEDIUM", growthRate:i.trustDegradationRatio },
  ];
  return signals.map((s,idx)=>({ ...s, confidence:clamp(60+s.growthRate*40), correlationId:`atlassian:drift:${i.tenantId}:${idx}`, traceId:`trace:atlassian:drift:${i.tenantId}:${idx}`, supportingEvidence:{tenantId:i.tenantId, suppressionRatio:i.suppressionRatio, governanceDriftRatio:i.governanceDriftRatio} }));
}

export function computeAtlassianSimulationCalibration(i: AtlassianPhaseCInput){
  const actionableProjected = clamp(i.projectedSavings - i.suppressedSavings, 0, Number.MAX_SAFE_INTEGER);
  const confidence = clamp(75 - i.governanceBacklog*0.7 - i.driftRate*20 - i.reversalRate*20 + i.workflowCompletionRate*20);
  return { actionableProjected, estimateOnlyProjected:i.suppressedSavings, confidence, reversalProbability:i.reversalRate, driftProbability:i.driftRate, governanceRiskWeighting:clamp(i.permissionTopologyRisks*5 + i.adminConcentrationRisks*5) };
}

export function computeAtlassianOutcomeCalibration(i: AtlassianPhaseCInput){
  const projected = i.projectedSavings;
  const delta = i.realizedSavings - projected;
  const confidenceAdjustment = clamp(i.realizationRate*100 - i.driftRate*40 - i.reversalRate*40 - 50);
  return { playbookId:"ATLASSIAN_PORTFOLIO_GOVERNANCE", projectedSavings:projected, realizedSavings:i.realizedSavings, calibrationDelta:delta, confidenceAdjustment, driftObserved:i.driftRate>0.1, reversalObserved:i.reversalRate>0.1 };
}

export function computeAtlassianOperationalMaturity(i: AtlassianPhaseCInput){
  const renewal = computeAtlassianRenewalReadiness(i);
  const score = clamp((
    clamp(100-renewal.trustRisk)+clamp(100-renewal.governanceRisk)+clamp(100-i.workflowBacklog*3)+
    clamp(70-i.suppressionRatio*20+i.realizationRate*20)+clamp(65-i.driftRate*20-i.reversalRate*20+i.realizationRate*30)+
    clamp(100-renewal.workspaceEntropyRisk)+clamp(100-renewal.marketplaceRisk)+clamp(100-i.permissionConflictRatio*100)+renewal.renewalReadinessScore
  )/9);
  return { score, band: band(score), dimensions: { trustMaturity:clamp(100-renewal.trustRisk), governanceMaturity:clamp(100-renewal.governanceRisk), workflowMaturity:clamp(100-i.workflowBacklog*3), telemetryMaturity:clamp(70-i.suppressionRatio*20+i.realizationRate*20), replayMaturity:clamp(65-i.driftRate*20-i.reversalRate*20+i.realizationRate*30), workspaceGovernanceMaturity:clamp(100-renewal.workspaceEntropyRisk), marketplaceGovernanceMaturity:clamp(100-renewal.marketplaceRisk), permissionGovernanceMaturity:clamp(100-i.permissionConflictRatio*100), renewalReadinessMaturity:renewal.renewalReadinessScore } };
}

export function generateAtlassianExecutiveReport(i: AtlassianPhaseCInput){
  const renewal = computeAtlassianRenewalReadiness(i);
  const maturity = computeAtlassianOperationalMaturity(i);
  const drift = computeAtlassianDriftSignals(i);
  return { projectedRecoverableSpend:renewal.projectedRecoverableSpend, realizedSavings:renewal.realizedSavings, suppressedSavings:renewal.suppressedRecoverableSpend, governanceRisk:renewal.governanceRisk, trustRisk:renewal.trustRisk, adminRisk:renewal.adminRisk, workspaceEntropyRisk:renewal.workspaceEntropyRisk, marketplaceRisk:renewal.marketplaceRisk, workflowBacklog:i.workflowBacklog, operationalMaturityScore:maturity.score, topGovernanceDriftSignals:drift.slice(0,3) };
}
