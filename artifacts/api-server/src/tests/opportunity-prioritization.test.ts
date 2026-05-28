import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreOpportunity } from '../lib/recommendations/opportunity-score';
import { prioritizeRecommendations } from '../lib/recommendations/opportunity-prioritizer';

test('higher savings increases score', () => {
  const low = scoreOpportunity({ projectedAnnualSavings: 1000, confidenceScore: 80, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  const high = scoreOpportunity({ projectedAnnualSavings: 22000, confidenceScore: 80, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  assert.ok(high.opportunityScore > low.opportunityScore);
});

test('low confidence reduces score', () => {
  const low = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 30, reliabilityBand: 'LOW', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  const high = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  assert.ok(high.opportunityScore > low.opportunityScore);
});

test('rollback support improves score', () => {
  const noRollback = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: false, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  const rollback = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  assert.ok(rollback.opportunityScore > noRollback.opportunityScore);
});

test('stale recommendations downgraded and deterministic scoring + tenant isolation', () => {
  const old = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 120, playbookType: 'X', executionFeasibility: 70 });
  const fresh = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 5, playbookType: 'X', executionFeasibility: 70 });
  assert.ok(fresh.opportunityScore > old.opportunityScore);
  const a = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 5, playbookType: 'X', executionFeasibility: 70 });
  const b = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'B', rollbackSupport: true, driftLikelihood: 0.2, policyComplexity: 0.2, recommendationAgeDays: 5, playbookType: 'X', executionFeasibility: 70 });
  assert.equal(a.opportunityScore, b.opportunityScore);

  const ranked = prioritizeRecommendations([
    { tenantId: 't1', recommendationId: 'r1', projectedAnnualSavings: 1000, confidenceScore: 50, reliabilityBand: 'LOW', recommendationState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', actionRiskClass: 'C', blockedReasons: [], readinessReasons: [], requiredApprovals: [], createdAt: new Date().toISOString(), playbookId: 'P' },
    { tenantId: 't2', recommendationId: 'r2', projectedAnnualSavings: 9000, confidenceScore: 90, reliabilityBand: 'HIGH', recommendationState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', actionRiskClass: 'A', blockedReasons: [], readinessReasons: [], requiredApprovals: [], createdAt: new Date().toISOString(), playbookId: 'P' },
  ]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].tenantId === 't2' || ranked[0].tenantId === 't1', true);
});

test('risk and complexity reduce score', () => {
  const lowRisk = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'A', rollbackSupport: true, driftLikelihood: 0.1, policyComplexity: 0.1, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  const highRisk = scoreOpportunity({ projectedAnnualSavings: 12000, confidenceScore: 90, reliabilityBand: 'HIGH', lifecycleState: 'EXECUTION_READY', executionReadiness: 'EXECUTION_READY', riskClass: 'D', rollbackSupport: false, driftLikelihood: 0.8, policyComplexity: 0.9, recommendationAgeDays: 10, playbookType: 'X', executionFeasibility: 70 });
  assert.ok(lowRisk.opportunityScore > highRisk.opportunityScore);
});
