import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeCanonicalOutcomeLedger } from '../hooks/useCanonicalOutcomeLedger'

// Regression coverage for "Preserve live outcome data in the ledger view": the hook must
// fetch and normalize /api/outcomes/proof for connected live workspaces instead of
// unconditionally returning NO_DATA. See useCanonicalOutcomeLedger.ts.

function sampleProof(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    outcomeId: 'oc-1',
    tenantId: 'tenant-1',
    sourcePlaybook: 'M365 Licence Reclaim',
    domain: 'm365',
    costCentre: 'IT-100',
    team: 'Platform Engineering',
    projectedMonthlySavings: 4000,
    approvedMonthlySavings: 3500,
    executedMonthlySavings: 3200,
    verifiedMonthlySavings: 3100,
    protectedMonthlySavings: 3000,
    proofState: 'VERIFIED',
    evidenceSummary: {
      hasProjectionEvidence: true, hasApprovalEvidence: true, hasExecutionEvidence: true,
      hasVerificationEvidence: true, hasRetentionEvidence: false, hasDriftProtectionEvidence: false,
    },
    proofTimeline: [
      { stage: 'projected', occurredAt: '2026-01-01T00:00:00.000Z', actorId: 'system' },
      { stage: 'approved', occurredAt: '2026-01-02T00:00:00.000Z', actorId: 'u1', evidenceRef: 'ev-approve-1' },
      { stage: 'executed', occurredAt: '2026-01-03T00:00:00.000Z', actorId: 'u2', evidenceRef: 'ev-execute-1' },
      { stage: 'verified', occurredAt: '2026-01-04T00:00:00.000Z', actorId: 'u3', evidenceRef: 'ev-verify-1' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
    ...overrides,
  }
}

test('successful live fetch: a well-formed OutcomeProof payload maps to a real, non-empty OutcomeRecord/OutcomeLedgerEvent set', () => {
  const { records, events } = normalizeCanonicalOutcomeLedger({ tenantId: 'tenant-1', proofs: [sampleProof()] })
  assert.equal(records.length, 1)
  const record = records[0]
  assert.equal(record.id, 'oc-1')
  assert.equal(record.tenantId, 'tenant-1')
  assert.equal(record.sourceDomain, 'M365')
  assert.equal(record.lifecycleStage, 'VERIFIED')
  assert.equal(record.proofState, 'VERIFIED')
  assert.equal(record.projectedValue, 4000)
  assert.equal(record.verifiedValue, 3100)
  assert.equal(record.costCentre, 'IT-100')
  assert.equal(record.createdAt, '2026-01-01T00:00:00.000Z')
  assert.equal(record.approvalEvidenceIds.includes('ev-approve-1'), true)
  assert.equal(record.executionEvidenceIds.includes('ev-execute-1'), true)
  assert.equal(record.verificationEvidenceIds.includes('ev-verify-1'), true)
  assert.equal(events.length, 4)
  assert.equal(events[1].eventType, 'OUTCOME_APPROVED')
  assert.equal(events[3].eventType, 'OUTCOME_VERIFIED')
})

test('empty live response: no proofs yields no records/events (not a crash, not fabricated rows)', () => {
  const { records, events } = normalizeCanonicalOutcomeLedger({ tenantId: 'tenant-1', proofs: [] })
  assert.deepEqual(records, [])
  assert.deepEqual(events, [])
})

test('malformed/missing payload shapes degrade to empty rather than throwing', () => {
  assert.deepEqual(normalizeCanonicalOutcomeLedger(undefined), { records: [], events: [] })
  assert.deepEqual(normalizeCanonicalOutcomeLedger({}), { records: [], events: [] })
  assert.deepEqual(normalizeCanonicalOutcomeLedger({ proofs: 'not-an-array' }), { records: [], events: [] })
})

test('a proof missing outcomeId is dropped rather than producing a record with a synthetic id', () => {
  const { records } = normalizeCanonicalOutcomeLedger({ proofs: [sampleProof({ outcomeId: undefined })] })
  assert.equal(records.length, 0)
})

test('unrecognised domain/proofState strings fall back to the closest honest default rather than being dropped or fabricated', () => {
  const { records } = normalizeCanonicalOutcomeLedger({ proofs: [sampleProof({ domain: 'some-unknown-system', proofState: 'SOMETHING_WEIRD' })] })
  assert.equal(records[0].sourceDomain, 'MANUAL')
  assert.equal(records[0].lifecycleStage, 'PROJECTED')
})

test('no synthetic live fallback: values not present in the raw proof are left undefined, never invented', () => {
  const { records } = normalizeCanonicalOutcomeLedger({ proofs: [sampleProof({ approvedMonthlySavings: undefined, verifiedMonthlySavings: undefined })] })
  assert.equal(records[0].approvedValue, undefined)
  assert.equal(records[0].verifiedValue, undefined)
  assert.equal(records[0].financeConfirmedValue, undefined, 'no raw field maps to finance-confirmed value; must stay undefined, not fabricated')
})

// ─── Hook wiring (static source checks, matching this codebase's existing convention
// for hook-level tests — see outcome-verification-evidence.test.tsx) ───────────────

const hookSource = fs.readFileSync(new URL('../hooks/useCanonicalOutcomeLedger.ts', import.meta.url), 'utf8')

test('the hook fetches /api/outcomes/proof for live workspaces instead of unconditionally returning NO_DATA', () => {
  assert.equal(hookSource.includes("path: '/api/outcomes/proof'"), true)
  assert.equal(hookSource.includes('useLiveResource'), true)
})

test('dataState reflects the actual fetch result (LIVE vs NO_DATA), not a hardcoded value', () => {
  assert.equal(hookSource.includes("dataState: live.isEmpty ? 'NO_DATA' : 'LIVE'"), true)
})

test('API/unauthorised errors surface through the hook rather than being swallowed', () => {
  assert.equal(hookSource.includes('live.error'), true)
})

test('demo mode still uses only the explicit DEMO_OUTCOME_RECORDS/DEMO_LEDGER_EVENTS fixtures, never the live fetch result', () => {
  const demoBranch = hookSource.slice(hookSource.indexOf("workspace.mode === 'demo'"), hookSource.indexOf("if (!workspace.dataReady)"))
  assert.equal(demoBranch.includes('DEMO_OUTCOME_RECORDS'), true)
  assert.equal(demoBranch.includes('DEMO_LEDGER_EVENTS'), true)
  assert.equal(demoBranch.includes('live.data'), false, 'demo branch must not read the live fetch result')
})

test('not-connected workspaces get an honest NOT_CONNECTED state, not live data or demo data', () => {
  const notConnectedBranch = hookSource.slice(hookSource.indexOf('if (!workspace.dataReady)'), hookSource.lastIndexOf('return {'))
  assert.equal(notConnectedBranch.includes("dataState: 'NOT_CONNECTED'"), true)
})
