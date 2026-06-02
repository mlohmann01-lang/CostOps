import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateExecutiveValue } from '../lib/executive-value/executive-value-aggregator'
import { OpportunityRepository } from '../lib/opportunities/opportunity-repository'
import { outcomeProofService } from '../lib/outcomes/outcome-proof-service'

const now = new Date().toISOString()
function opportunity(tenantId: string, id: string, monthly: number) {
  return { id, tenantId, source: 'M365_PLAYBOOK' as const, sourceReferenceId: id, title: `Opportunity ${id}`, description: 'Executive value test opportunity', domain: 'M365' as const, projectedMonthlySavings: monthly, projectedAnnualSavings: monthly * 12, confidenceScore: 90, trustScore: 90, readiness: 'APPROVAL_REQUIRED' as const, status: 'APPROVAL_PENDING' as const, createdAt: now, updatedAt: now, urgency: 'HIGH' as const }
}

test('executive value aggregator uses Outcome Proof before opportunity fallback and calculates conversions', async () => {
  const tenantId = 'tenant-executive-proof-first'
  outcomeProofService.clearForTests()
  const repo = new OpportunityRepository(); repo.clearForTests(); repo.upsert(tenantId, opportunity(tenantId, 'opp-proof-first', 999))
  await outcomeProofService.upsertProof(tenantId, { outcomeId: 'outcome-proof-first', opportunityId: 'opp-proof-first', domain: 'M365', projectedMonthlySavings: 100, projectedAnnualSavings: 1200, approvedMonthlySavings: 50, approvedAnnualSavings: 600, executedMonthlySavings: 25, executedAnnualSavings: 300, verifiedMonthlySavings: 25, verifiedAnnualSavings: 300, retainedMonthlySavings: 20, retainedAnnualSavings: 240, protectedMonthlySavings: 5, protectedAnnualSavings: 60, proofState: 'VERIFIED', confidenceBand: 'HIGH', evidenceSummary: { hasProjectionEvidence: true, hasApprovalEvidence: true, hasExecutionEvidence: true, hasVerificationEvidence: true, hasRetentionEvidence: false, hasDriftProtectionEvidence: false } })
  const summary = await aggregateExecutiveValue(tenantId)
  assert.equal(summary.valueMetrics.projectedMonthlySavings, 100)
  assert.equal(summary.metricSources.projectedMonthlySavings.source, 'OUTCOME_PROOF')
  assert.equal(summary.valueMetrics.verifiedMonthlySavings, 25)
  assert.equal(summary.valueMetrics.retainedMonthlySavings, 20)
  assert.equal(summary.valueMetrics.protectedMonthlySavings, 5)
  assert.equal(summary.conversionRates.approvedVsProjectedPercent, 50)
  assert.equal(summary.conversionRates.verifiedVsExecutedPercent, 100)
})

test('executive value aggregator falls back to Opportunity Authority only when proof projection is unavailable', async () => {
  const tenantId = 'tenant-executive-opportunity-fallback'
  outcomeProofService.clearForTests()
  const repo = new OpportunityRepository(); repo.clearForTests(); repo.upsert(tenantId, opportunity(tenantId, 'opp-fallback', 321))
  const summary = await aggregateExecutiveValue(tenantId)
  assert.equal(summary.valueMetrics.projectedMonthlySavings, 321)
  assert.equal(summary.metricSources.projectedMonthlySavings.source, 'OPPORTUNITY_FALLBACK')
  assert.equal(summary.valueMetrics.verifiedMonthlySavings, 0)
})
