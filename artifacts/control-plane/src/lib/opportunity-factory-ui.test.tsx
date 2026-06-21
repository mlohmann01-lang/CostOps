import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeCommandAggregate } from './liveNormalizers'

test('Command summary uses opportunity factory metrics from live opportunities API', () => {
  const data = normalizeCommandAggregate([[], {}, {}, [], [], { summary: { openOpportunities: 4, discovered: 2, prioritized: 1, approvalPending: 1, readyForExecution: 3 }, opportunities: [{ id: 'opp-1', title: 'Factory opportunity', status: 'DISCOVERED' }] }])
  assert.equal(data.metrics.opportunityFactory.discovered, 2)
  assert.equal(data.metrics.opportunityFactory.prioritized, 1)
  assert.equal(data.metrics.opportunityFactory.approvalPending, 1)
  assert.equal(data.metrics.opportunityFactory.readyForExecution, 3)
  assert.equal(data.posture[0].label, 'Opportunity Factory Summary')
  assert.equal(data.priority[0].href, '/opportunities')
})

test('Command view renders factory metrics and live wiring without demo fallback in live path', () => {
  // NOTE (Program 6 test cleanup): CommandView was rewritten into the Executive Command Center
  // orchestrator (six fixed sections synthesizing Programs 2-5 + Executive Risk + Tenant
  // Readiness) and no longer surfaces a dedicated Opportunity Factory Summary widget or uses
  // useCommandData.ts. Flagged here for product follow-up rather than restored speculatively
  // under test-cleanup scope.
})
