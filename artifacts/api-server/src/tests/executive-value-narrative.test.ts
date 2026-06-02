import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExecutiveValueNarrative } from '../lib/executive-value/executive-value-narrative'
import type { ExecutiveValueAggregate } from '../lib/executive-value/executive-value-types'

test('executive value narrative is conservative and avoids unsupported claims', () => {
  const aggregate: ExecutiveValueAggregate = { tenantId: 'tenant-narrative', generatedAt: new Date().toISOString(), valueMetrics: { projectedMonthlySavings: 48000, approvedMonthlySavings: 18000, executedMonthlySavings: 1200, verifiedMonthlySavings: 1200, retainedMonthlySavings: 1200, protectedMonthlySavings: 250, projectedAnnualSavings: 576000, approvedAnnualSavings: 216000, executedAnnualSavings: 14400, verifiedAnnualSavings: 14400, retainedAnnualSavings: 14400, protectedAnnualSavings: 3000 }, metricSources: {} as any, conversionRates: { approvedVsProjectedPercent: 38, executedVsApprovedPercent: 7, verifiedVsExecutedPercent: 100, retainedVsVerifiedPercent: 100, protectedVsVerifiedPercent: 21 }, confidence: { evidenceCompletenessPercent: 82, outcomeConfidenceBand: 'MEDIUM', trustCoveragePercent: 76, connectorCoveragePercent: 85, executionCoveragePercent: 6 }, counts: { openOpportunities: 22, priorityOpportunities: 5, approvalsPending: 2, executionsCompleted: 1, outcomesVerified: 1, driftAlertsOpen: 1, evidencePacksGenerated: 3 }, byDomain: [{ domain: 'M365', projectedMonthlySavings: 48000, verifiedMonthlySavings: 1200, protectedMonthlySavings: 250, confidenceBand: 'MEDIUM' }], topValueDrivers: [], blockers: [{ id: 'trust', title: 'Trust', type: 'TRUST', blockedValue: 18000, reason: 'Usage trust not high.', recommendedAction: 'Resolve trust blockers.' }] }
  const narrative = buildExecutiveValueNarrative(aggregate)
  const text = Object.values(narrative).flat().join(' ')
  assert.match(narrative.headline, /identified \$48,000\/month/)
  assert.match(narrative.riskSummary, /Controlled execution should remain limited/)
  assert.doesNotMatch(text, /guaranteed|guarantee|risk-free|certain/i)
})
