import assert from 'node:assert/strict'
import type { M365OpportunityCandidate } from '../lib/playbooks/m365/m365-playbook-types'

export function assertEconomicAssessment(candidate: M365OpportunityCandidate) {
  assert.ok(candidate.economicAssessment)
  assert.ok(candidate.savingsConfidence)
  assert.ok(candidate.evidenceQuality)
  assert.ok(candidate.executionSafety)
  assert.ok(candidate.falsePositiveRisk)
  assert.ok(candidate.productionReadiness)
  assert.ok(candidate.economicAssessment.allowedNextStep)
  assert.equal(candidate.opportunityPayload.economicAssessment.allowedNextStep, candidate.economicAssessment.allowedNextStep)
}
