import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import type { CommandViewRuntimeOptions } from './commandViewData.js'
import { loadConnectorHubState } from './connectorHubData.js'
import { loadCommandViewState } from './commandViewData.js'
import { loadGovernanceState } from './governanceData.js'
import { loadExecutionState } from './executionData.js'
import { loadIntelligenceState } from './intelligenceViewData.js'
import { loadOutcomeLedgerState } from './outcomeLedgerData.js'
import { loadDriftMonitorState } from './driftMonitorData.js'

const DEMO_RUNTIME: CommandViewRuntimeOptions = {
  environment: 'DEMO',
  tenantId: 'smoke-test-tenant',
  tenantMode: 'DEMO',
  executionCapabilities: {
    liveExecutionEnabled: false,
    simulatedExecutionEnabled: true,
    approvalEnabled: true,
    rollbackEnabled: true,
    dryRunEnabled: true,
  },
  connectorPolicy: {
    allowSynthetic: true,
    allowLiveConnectors: false,
    requireConnectorHealthForLive: true,
  },
}

describe('ConnectorHub smoke test', () => {
  test('loadConnectorHubState returns without throwing', async () => {
    const state = await loadConnectorHubState(DEMO_RUNTIME)
    assert.ok(state !== null && state !== undefined)
  })
  test('has metadata with environment', async () => {
    const state = await loadConnectorHubState(DEMO_RUNTIME)
    assert.equal(state.metadata.environment, 'DEMO')
    assert.ok(typeof state.metadata.tenantId === 'string')
  })
  test('has summary with numeric fields', async () => {
    const state = await loadConnectorHubState(DEMO_RUNTIME)
    assert.ok(typeof state.summary.healthy === 'number')
    assert.ok(typeof state.summary.degraded === 'number')
    assert.ok(typeof state.summary.blocked === 'number')
  })
  test('connectors array is defined', async () => {
    const state = await loadConnectorHubState(DEMO_RUNTIME)
    assert.ok(Array.isArray(state.connectors))
  })
})

describe('CommandView smoke test', () => {
  test('loadCommandViewState returns without throwing', async () => {
    const state = await loadCommandViewState(DEMO_RUNTIME)
    assert.ok(state !== null && state !== undefined)
  })
  test('has globalVerdict string', async () => {
    const state = await loadCommandViewState(DEMO_RUNTIME)
    assert.ok(typeof state.globalVerdict === 'string')
  })
  test('actionQueue is an array', async () => {
    const state = await loadCommandViewState(DEMO_RUNTIME)
    assert.ok(Array.isArray(state.actionQueue))
  })
  test('summary has numeric savings fields', async () => {
    const state = await loadCommandViewState(DEMO_RUNTIME)
    assert.ok(typeof state.summary.monthlySavingsIdentified === 'number')
    assert.ok(typeof state.summary.verifiedRealizedSavings === 'number')
  })
  test('each action has id, title, state, nextStep', async () => {
    const state = await loadCommandViewState(DEMO_RUNTIME)
    for (const action of state.actionQueue) {
      assert.ok(typeof action.id === 'string', `action missing id`)
      assert.ok(typeof action.title === 'string', `action missing title`)
      assert.ok(typeof action.state === 'string', `action missing state`)
      assert.ok(typeof action.nextStep === 'string', `action missing nextStep`)
    }
  })
})

describe('GovernanceView smoke test', () => {
  test('loadGovernanceState returns without throwing', async () => {
    const state = await loadGovernanceState(DEMO_RUNTIME)
    assert.ok(state !== null && state !== undefined)
  })
  test('summary has approvalsRequired and blockedActions', async () => {
    const state = await loadGovernanceState(DEMO_RUNTIME)
    assert.ok(typeof state.summary.approvalsRequired === 'number')
    assert.ok(typeof state.summary.blockedActions === 'number')
  })
  test('approvalQueue entries have approvalState', async () => {
    const state = await loadGovernanceState(DEMO_RUNTIME)
    const validStates = ['PENDING','APPROVED','REJECTED','NOT_REQUIRED']
    for (const item of state.approvalQueue) {
      assert.ok(validStates.includes(item.approvalState), `Invalid approvalState: ${item.approvalState}`)
    }
  })
  test('policyGates have status field', async () => {
    const state = await loadGovernanceState(DEMO_RUNTIME)
    const validStatuses = ['PASSED','WARNING','FAILED','BLOCKED','NOT_AVAILABLE']
    for (const gate of state.policyGates) {
      assert.ok(validStatuses.includes(gate.status), `Invalid gate status: ${gate.status}`)
    }
  })
})

describe('ExecutionView smoke test', () => {
  test('loadExecutionState returns without throwing', async () => {
    const state = await loadExecutionState(DEMO_RUNTIME)
    assert.ok(state !== null && state !== undefined)
  })
  test('summary has execution count fields', async () => {
    const state = await loadExecutionState(DEMO_RUNTIME)
    assert.ok(typeof state.summary.queued === 'number')
    assert.ok(typeof state.summary.verified === 'number')
    assert.ok(typeof state.summary.failed === 'number')
  })
  test('records have required fields', async () => {
    const state = await loadExecutionState(DEMO_RUNTIME)
    const validStatuses = ['QUEUED','DRY_RUN_READY','APPROVAL_PENDING','EXECUTING','EXECUTED','VERIFIED','FAILED','BLOCKED','ROLLED_BACK']
    for (const r of state.records) {
      assert.ok(typeof r.id === 'string')
      assert.ok(validStatuses.includes(r.status), `Invalid status: ${r.status}`)
      assert.ok(typeof r.nextStep === 'string')
    }
  })
})

describe('IntelligenceView smoke test', () => {
  test('loadIntelligenceState returns without throwing', async () => {
    const state = await loadIntelligenceState(DEMO_RUNTIME)
    assert.ok(state !== null && state !== undefined)
  })
  test('summary has confidence and sourceCoverage', async () => {
    const state = await loadIntelligenceState(DEMO_RUNTIME)
    assert.ok(typeof state.summary.confidence === 'number')
    assert.ok(typeof state.summary.sourceCoverage === 'number')
  })
  test('recommendations each have lineage metadata', async () => {
    const state = await loadIntelligenceState(DEMO_RUNTIME)
    for (const rec of state.recommendations) {
      assert.ok(rec.lineage !== undefined, `${rec.id} missing lineage`)
      assert.ok(typeof rec.lineage.evidenceId === 'string')
      assert.ok(typeof rec.lineage.trustScore === 'number')
      assert.ok(typeof rec.lineage.confidenceScore === 'number')
      assert.ok(['PASSED','WARNING','FAILED','BLOCKED'].includes(rec.lineage.policyResult))
    }
  })
})

describe('OutcomeLedgerView smoke test', () => {
  test('loadOutcomeLedgerState returns without throwing', async () => {
    const state = await loadOutcomeLedgerState(DEMO_RUNTIME)
    assert.ok(state !== null && state !== undefined)
  })
  test('summary has projectedMonthlySavings and verifiedMonthlySavings', async () => {
    const state = await loadOutcomeLedgerState(DEMO_RUNTIME)
    assert.ok(typeof state.summary.projectedMonthlySavings === 'number')
    assert.ok(typeof state.summary.verifiedMonthlySavings === 'number')
  })
  test('outcomes have valid status', async () => {
    const state = await loadOutcomeLedgerState(DEMO_RUNTIME)
    const valid = ['PROJECTED','APPROVED','EXECUTED','VERIFIED','DRIFTED','BLOCKED']
    for (const o of state.outcomes) {
      assert.ok(valid.includes(o.status), `Invalid outcome status: ${o.status}`)
    }
  })
})

describe('DriftMonitorView smoke test', () => {
  test('loadDriftMonitorState returns without throwing', async () => {
    const state = await loadDriftMonitorState(DEMO_RUNTIME)
    assert.ok(state !== null && state !== undefined)
  })
  test('summary has activeDriftEvents and valueAtRisk', async () => {
    const state = await loadDriftMonitorState(DEMO_RUNTIME)
    assert.ok(typeof state.summary.activeDriftEvents === 'number')
    assert.ok(typeof state.summary.valueAtRisk === 'number')
  })
  test('events have severity and recommendedAction', async () => {
    const state = await loadDriftMonitorState(DEMO_RUNTIME)
    const validSeverities = ['LOW','MEDIUM','HIGH','CRITICAL']
    for (const e of state.events) {
      assert.ok(validSeverities.includes(e.severity))
      assert.ok(typeof e.recommendedAction === 'string')
    }
  })
})
