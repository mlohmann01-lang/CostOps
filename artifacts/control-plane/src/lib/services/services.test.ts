import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import type { CommandViewRuntimeOptions } from '../commandViewData.js'
import { connectorService } from './connectorService.js'
import { commandService } from './commandService.js'
import { governanceService } from './governanceService.js'
import { executionService } from './executionService.js'
import { intelligenceService } from './intelligenceService.js'
import { outcomeLedgerService } from './outcomeLedgerService.js'
import { driftService } from './driftService.js'
import { canonicalStates } from '../semantics.js'

const DEMO_RUNTIME: CommandViewRuntimeOptions = {
  environment: 'DEMO',
  tenantId: 'test-tenant',
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

function assertSemantics(result: {
  canonicalState: unknown
  evidenceLineage: {
    evidenceId: string
    lineage: string[]
    trustScore: number
    confidenceScore: number
    policyResult: string
  }
  trustScore: number
  confidenceScore: number
  policyResult: string
}, label: string) {
  assert.ok(canonicalStates.includes(result.canonicalState as never), `${label}: invalid canonicalState: ${result.canonicalState}`)
  assert.ok(typeof result.evidenceLineage.evidenceId === 'string' && result.evidenceLineage.evidenceId.startsWith('ev-'), `${label}: evidenceId must start with ev-`)
  assert.ok(result.evidenceLineage.lineage.length > 0, `${label}: lineage must be non-empty`)
  assert.ok(result.trustScore >= 0 && result.trustScore <= 1, `${label}: trustScore out of range: ${result.trustScore}`)
  assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 1, `${label}: confidenceScore out of range: ${result.confidenceScore}`)
  assert.ok(['PASSED','WARNING','FAILED','BLOCKED'].includes(result.policyResult), `${label}: invalid policyResult: ${result.policyResult}`)
}

describe('connectorService', () => {
  test('returns typed result with semantic contract', async () => {
    const result = await connectorService(DEMO_RUNTIME)
    assert.ok(result.data !== null)
    assertSemantics(result, 'connectorService')
  })
  test('DEMO returns DEMO_SEED metadata', async () => {
    const result = await connectorService(DEMO_RUNTIME)
    assert.equal(result.data.metadata.dataSource, 'DEMO_SEED')
  })
  test('evidenceLineage policyResult matches canonicalState', async () => {
    const result = await connectorService(DEMO_RUNTIME)
    assert.equal(result.evidenceLineage.policyResult, result.policyResult)
  })
})

describe('commandService', () => {
  test('returns typed result with semantic contract', async () => {
    const result = await commandService(DEMO_RUNTIME)
    assert.ok(result.data !== null)
    assertSemantics(result, 'commandService')
  })
  test('DEMO actionQueue is non-empty', async () => {
    const result = await commandService(DEMO_RUNTIME)
    assert.ok(result.data.actionQueue.length > 0)
  })
  test('each action has a canonical state', async () => {
    const result = await commandService(DEMO_RUNTIME)
    assert.ok(result.data.actionQueue.every(a => typeof a.state === 'string'))
  })
})

describe('governanceService', () => {
  test('returns typed result with semantic contract', async () => {
    const result = await governanceService(DEMO_RUNTIME)
    assert.ok(result.data !== null)
    assertSemantics(result, 'governanceService')
  })
  test('DEMO has summary with policy gates', async () => {
    const result = await governanceService(DEMO_RUNTIME)
    assert.ok(result.data.policyGates.length > 0)
  })
  test('trustScore is derived from averageTrustScore', async () => {
    const result = await governanceService(DEMO_RUNTIME)
    const expectedApprox = (result.data.summary.averageTrustScore ?? 75) / 100
    assert.ok(Math.abs(result.trustScore - expectedApprox) < 0.01)
  })
})

describe('executionService', () => {
  test('returns typed result with semantic contract', async () => {
    const result = await executionService(DEMO_RUNTIME)
    assert.ok(result.data !== null)
    assertSemantics(result, 'executionService')
  })
  test('DEMO records array is defined', async () => {
    const result = await executionService(DEMO_RUNTIME)
    assert.ok(Array.isArray(result.data.records))
  })
  test('summary has all required fields', async () => {
    const result = await executionService(DEMO_RUNTIME)
    const s = result.data.summary
    assert.ok('queued' in s && 'verified' in s && 'failed' in s)
  })
})

describe('intelligenceService', () => {
  test('returns typed result with semantic contract', async () => {
    const result = await intelligenceService(DEMO_RUNTIME)
    assert.ok(result.data !== null)
    assertSemantics(result, 'intelligenceService')
  })
  test('DEMO recommendations have lineage metadata', async () => {
    const result = await intelligenceService(DEMO_RUNTIME)
    for (const rec of result.data.recommendations) {
      assert.ok(rec.lineage !== undefined, `Recommendation ${rec.id} missing lineage`)
      assert.ok(rec.lineage.evidenceId.startsWith('ev-'))
      assert.ok(rec.lineage.lineage.length > 0)
    }
  })
  test('trustScore derived from confidence', async () => {
    const result = await intelligenceService(DEMO_RUNTIME)
    const expected = result.data.summary.confidence / 100
    assert.ok(Math.abs(result.trustScore - expected) < 0.01)
  })
})

describe('outcomeLedgerService', () => {
  test('returns typed result with semantic contract', async () => {
    const result = await outcomeLedgerService(DEMO_RUNTIME)
    assert.ok(result.data !== null)
    assertSemantics(result, 'outcomeLedgerService')
  })
  test('DEMO has at least one outcome', async () => {
    const result = await outcomeLedgerService(DEMO_RUNTIME)
    assert.ok(result.data.outcomes.length > 0)
  })
  test('DEMO outcome has status field', async () => {
    const result = await outcomeLedgerService(DEMO_RUNTIME)
    const statuses = ['PROJECTED','APPROVED','EXECUTED','VERIFIED','DRIFTED','BLOCKED']
    for (const o of result.data.outcomes) {
      assert.ok(statuses.includes(o.status), `Unexpected status: ${o.status}`)
    }
  })
})

describe('driftService', () => {
  test('returns typed result with semantic contract', async () => {
    const result = await driftService(DEMO_RUNTIME)
    assert.ok(result.data !== null)
    assertSemantics(result, 'driftService')
  })
  test('DEMO has drift event with severity', async () => {
    const result = await driftService(DEMO_RUNTIME)
    const severities = ['LOW','MEDIUM','HIGH','CRITICAL']
    for (const e of result.data.events) {
      assert.ok(severities.includes(e.severity), `Unexpected severity: ${e.severity}`)
    }
  })
  test('canonicalState is DRIFT_DETECTED when active events exist', async () => {
    const result = await driftService(DEMO_RUNTIME)
    if (result.data.summary.activeDriftEvents > 0) {
      assert.ok(result.canonicalState === 'DRIFT_DETECTED' || result.canonicalState === 'QUARANTINED')
    }
  })
})
