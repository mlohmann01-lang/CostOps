import test from 'node:test'
import assert from 'node:assert/strict'
import { OpportunitySourceRegistry } from '../lib/opportunity-factory/opportunity-source-registry'
import { runOpportunityFactory } from '../lib/opportunity-factory/opportunity-factory-service'
import { OpportunityRepository } from '../lib/opportunities/opportunity-repository'
import { M365OpportunityProvider } from '../lib/playbooks/m365/m365-opportunity-provider'
import { seedM365PlaybookSnapshot } from './m365-playbook-fixture'

test('M365 opportunities carry economic assessment and never map to eligible', async () => {
  const { tenantId } = seedM365PlaybookSnapshot('tenant-economic-assessment')
  const registry = new OpportunitySourceRegistry().register(new M365OpportunityProvider())
  const repo = new OpportunityRepository()
  repo.replaceTenant(tenantId, [])
  const out = await runOpportunityFactory(tenantId, { registry, repository: repo })
  const m365 = out.opportunities.filter((o: any) => o.source === 'M365_PLAYBOOK') as any[]
  assert.ok(m365.length > 0)
  for (const opportunity of m365) {
    assert.ok(opportunity.economicAssessment)
    assert.ok(opportunity.savingsConfidence)
    assert.ok(opportunity.evidenceQuality)
    assert.ok(opportunity.executionSafety)
    assert.ok(opportunity.falsePositiveRisk)
    assert.ok(opportunity.productionReadiness)
    assert.ok(opportunity.allowedNextStep)
    assert.notEqual(opportunity.readiness, 'ELIGIBLE')
  }
})
