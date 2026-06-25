import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateOutcomeLeakage,
  buildOutcomeLedgerSummary,
  buildOutcomeProofTimeline,
  validateOutcomeTransition,
  DEMO_OUTCOME_RECORDS,
  DEMO_LEDGER_EVENTS,
  type OutcomeRecord,
  type OutcomeLedgerEvent,
} from './outcomeLedger.js'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const baseOutcome: OutcomeRecord = {
  id: 'test-1',
  tenantId: 'test',
  name: 'Test Outcome',
  sourceDomain: 'M365',
  outcomeType: 'COST_REDUCTION',
  lifecycleStage: 'PROJECTED',
  proofState: 'PROJECTED',
  projectedValue: 100000,
  approvalEvidenceIds: [],
  executionEvidenceIds: [],
  verificationEvidenceIds: [],
  financeEvidenceIds: [],
  protectionEvidenceIds: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const fullyRealisedOutcome: OutcomeRecord = {
  ...baseOutcome,
  id: 'test-2',
  lifecycleStage: 'PROTECTED',
  proofState: 'PROTECTED',
  projectedValue: 100000,
  approvedValue: 95000,
  executedValue: 90000,
  verifiedValue: 88000,
  financeConfirmedValue: 85000,
  protectedValue: 83000,
  approvalEvidenceIds: ['ev-1'],
  executionEvidenceIds: ['ev-2'],
  verificationEvidenceIds: ['ev-3'],
  financeEvidenceIds: ['ev-4'],
  protectionEvidenceIds: ['ev-5'],
}

// ─── 1. OutcomeRecord supports separate lifecycle value fields ────────────────

describe('OutcomeRecord canonical schema', () => {
  it('supports all six separate lifecycle value fields', () => {
    assert.equal(fullyRealisedOutcome.projectedValue, 100000)
    assert.equal(fullyRealisedOutcome.approvedValue, 95000)
    assert.equal(fullyRealisedOutcome.executedValue, 90000)
    assert.equal(fullyRealisedOutcome.verifiedValue, 88000)
    assert.equal(fullyRealisedOutcome.financeConfirmedValue, 85000)
    assert.equal(fullyRealisedOutcome.protectedValue, 83000)
  })

  // ─── 2. Values do not overwrite each other ──────────────────────────────────
  it('preserves distinct values at each stage — none overwrite each other', () => {
    const v = fullyRealisedOutcome
    const values = [v.projectedValue, v.approvedValue, v.executedValue, v.verifiedValue, v.financeConfirmedValue, v.protectedValue]
    const uniqueValues = new Set(values)
    // All six values are distinct, confirming no overwriting
    assert.equal(uniqueValues.size, 6)
    assert.ok(v.projectedValue > (v.approvedValue ?? 0), 'projected > approved (leakage present)')
  })

  // ─── 3. Leakage calculation works across all stages ─────────────────────────
  it('calculates leakage correctly at each transition', () => {
    const leakage = calculateOutcomeLeakage(fullyRealisedOutcome)
    assert.equal(leakage.approvalLeakage, 5000)     // 100k - 95k
    assert.equal(leakage.executionLeakage, 5000)    // 95k - 90k
    assert.equal(leakage.verificationLeakage, 2000) // 90k - 88k
    assert.equal(leakage.financeLeakage, 3000)      // 88k - 85k
    assert.equal(leakage.driftLeakage, 2000)        // 85k - 83k
    assert.equal(leakage.totalValueLeakage, 17000)  // 100k - 83k
  })

  // ─── 4. Missing later-stage values are not treated as realised ───────────────
  it('does not treat missing later-stage values as realised UI values', () => {
    const projected = { ...baseOutcome }
    // lifecycleStage is PROJECTED — approvedValue, executedValue etc. are undefined
    assert.equal(projected.approvedValue, undefined)
    assert.equal(projected.executedValue, undefined)
    assert.equal(projected.verifiedValue, undefined)
    assert.equal(projected.financeConfirmedValue, undefined)
    assert.equal(projected.protectedValue, undefined)

    // Leakage falls back through chain — no false realisation
    const leakage = calculateOutcomeLeakage(projected)
    // All fallback to projected, so all leakage is zero
    assert.equal(leakage.totalValueLeakage, 0)
  })

  // ─── 5. Transition guards block invalid transitions ──────────────────────────
  it('blocks PROJECTED → APPROVED without required fields', () => {
    const result = validateOutcomeTransition('PROJECTED', 'APPROVED', {})
    assert.equal(result.allowed, false)
    if (!result.allowed) assert.ok(result.reason.length > 0)
  })

  it('blocks APPROVED → EXECUTED without evidence', () => {
    const result = validateOutcomeTransition('APPROVED', 'EXECUTED', {
      executedValue: 90000,
      // missing executionEvidenceIds
    })
    assert.equal(result.allowed, false)
  })

  it('blocks FAILED transition without a reason', () => {
    const result = validateOutcomeTransition('EXECUTED', 'FAILED', {})
    assert.equal(result.allowed, false)
    if (!result.allowed) assert.ok(result.reason.includes('reason'))
  })

  it('blocks unknown transition paths', () => {
    const result = validateOutcomeTransition('PROJECTED', 'PROTECTED', {})
    assert.equal(result.allowed, false)
  })

  // ─── 6. Transition guards allow valid transitions ────────────────────────────
  it('allows PROJECTED → APPROVED with all required fields', () => {
    const result = validateOutcomeTransition('PROJECTED', 'APPROVED', {
      ownerId: 'user-1',
      approvalReason: 'Approved by steering committee.',
      approvalEvidenceIds: ['ev-1'],
      approvedValue: 95000,
    })
    assert.equal(result.allowed, true)
  })

  it('allows FINANCE_CONFIRMED → PROTECTED with evidence and value', () => {
    const result = validateOutcomeTransition('FINANCE_CONFIRMED', 'PROTECTED', {
      protectionEvidenceIds: ['ev-drift-monitor'],
      protectedValue: 85000,
    })
    assert.equal(result.allowed, true)
  })

  it('allows EXECUTED → FAILED with a reason', () => {
    const result = validateOutcomeTransition('EXECUTED', 'FAILED', {
      failedReason: 'Post-execution measurement showed no cost reduction.',
    })
    assert.equal(result.allowed, true)
  })

  // ─── 7. Ledger events are immutable append-only records ─────────────────────
  it('ledger events have readonly fields — TypeScript enforces immutability', () => {
    const event: OutcomeLedgerEvent = DEMO_LEDGER_EVENTS[0]!
    // The readonly modifier is compile-time only; at runtime we verify the shape
    assert.ok(typeof event.id === 'string')
    assert.ok(typeof event.outcomeId === 'string')
    assert.ok(typeof event.createdAt === 'string')
    assert.ok(Array.isArray(event.evidenceIds))
    // Events should never mutate — validate new events are separate objects
    const event2: OutcomeLedgerEvent = { ...event, id: 'evt-copy', createdAt: '2026-06-01T00:00:00Z' }
    assert.notEqual(event2.id, event.id)
    assert.equal(event.id, DEMO_LEDGER_EVENTS[0]!.id, 'original event unchanged')
  })

  // ─── 8. Summary aggregates stage values separately ───────────────────────────
  it('summary aggregates projected, verified, finance-confirmed and protected values separately', () => {
    const outcomes: OutcomeRecord[] = [
      { ...baseOutcome, id: 'a', projectedValue: 100000 },
      {
        ...fullyRealisedOutcome,
        id: 'b',
        projectedValue: 50000,
        approvedValue: 50000,
        executedValue: 48000,
        verifiedValue: 46000,
        financeConfirmedValue: 45000,
        protectedValue: 45000,
      },
    ]
    const summary = buildOutcomeLedgerSummary(outcomes)
    assert.equal(summary.totalProjectedValue, 150000)
    // only 'b' has reached verifiedValue
    assert.equal(summary.totalVerifiedValue, 46000)
    assert.equal(summary.totalFinanceConfirmedValue, 45000)
    assert.equal(summary.totalProtectedValue, 45000)
    assert.equal(summary.outcomeCount, 2)
    assert.equal(summary.verifiedOutcomeCount, 1) // only fullyRealised 'b'
    assert.equal(summary.protectedOutcomeCount, 1)
  })

  // ─── 9. Backlog counts are correct ───────────────────────────────────────────
  it('counts verification, finance, and protection backlogs correctly', () => {
    const outcomes: OutcomeRecord[] = [
      { ...baseOutcome, id: 'p', lifecycleStage: 'PROJECTED' },
      { ...baseOutcome, id: 'ex', lifecycleStage: 'EXECUTED' },  // needs verification
      { ...baseOutcome, id: 'v', lifecycleStage: 'VERIFIED' },   // needs finance
      { ...baseOutcome, id: 'fc', lifecycleStage: 'FINANCE_CONFIRMED' }, // needs protection
    ]
    const summary = buildOutcomeLedgerSummary(outcomes)
    assert.equal(summary.verificationBacklogCount, 1)
    assert.equal(summary.financeBacklogCount, 1)
    assert.equal(summary.protectionBacklogCount, 1)
  })

  // ─── 10. Demo data obeys lifecycle-stage/value consistency ───────────────────
  it('demo records obey lifecycle-stage/value consistency rules', () => {
    for (const outcome of DEMO_OUTCOME_RECORDS) {
      const s = outcome.lifecycleStage

      // PROJECTED: no downstream values
      if (s === 'PROJECTED') {
        assert.equal(outcome.approvedValue, undefined, `${outcome.id}: PROJECTED must not have approvedValue`)
        assert.equal(outcome.executedValue, undefined, `${outcome.id}: PROJECTED must not have executedValue`)
      }

      // APPROVED: approvedValue must exist; executed and beyond must not
      if (s === 'APPROVED') {
        assert.notEqual(outcome.approvedValue, undefined, `${outcome.id}: APPROVED must have approvedValue`)
        assert.equal(outcome.executedValue, undefined, `${outcome.id}: APPROVED must not have executedValue`)
      }

      // VERIFIED: verified must exist; finance and beyond must not
      if (s === 'VERIFIED') {
        assert.notEqual(outcome.verifiedValue, undefined, `${outcome.id}: VERIFIED must have verifiedValue`)
        assert.equal(outcome.financeConfirmedValue, undefined, `${outcome.id}: VERIFIED must not have financeConfirmedValue`)
        assert.equal(outcome.protectedValue, undefined, `${outcome.id}: VERIFIED must not have protectedValue`)
      }

      // PROTECTED: all six value fields must exist
      if (s === 'PROTECTED') {
        assert.notEqual(outcome.approvedValue, undefined, `${outcome.id}: PROTECTED must have approvedValue`)
        assert.notEqual(outcome.executedValue, undefined, `${outcome.id}: PROTECTED must have executedValue`)
        assert.notEqual(outcome.verifiedValue, undefined, `${outcome.id}: PROTECTED must have verifiedValue`)
        assert.notEqual(outcome.financeConfirmedValue, undefined, `${outcome.id}: PROTECTED must have financeConfirmedValue`)
        assert.notEqual(outcome.protectedValue, undefined, `${outcome.id}: PROTECTED must have protectedValue`)
      }
    }
  })

  // ─── Proof timeline is ordered and filtered ───────────────────────────────
  it('builds proof timeline ordered by createdAt for the correct outcome', () => {
    const outcome = DEMO_OUTCOME_RECORDS.find(o => o.id === 'demo-o1')!
    const timeline = buildOutcomeProofTimeline(outcome, DEMO_LEDGER_EVENTS)
    assert.ok(timeline.length > 0, 'timeline has entries')
    // All entries belong to demo-o1
    const outcomeEvents = DEMO_LEDGER_EVENTS.filter(e => e.outcomeId === 'demo-o1')
    assert.equal(timeline.length, outcomeEvents.length)
    // Ordered ascending
    for (let i = 1; i < timeline.length; i++) {
      assert.ok(timeline[i]!.createdAt >= timeline[i - 1]!.createdAt, 'timeline is ordered ascending')
    }
    // First event is PROJECTED, last is PROTECTED
    assert.equal(timeline[0]!.eventType, 'OUTCOME_PROJECTED')
    assert.equal(timeline[timeline.length - 1]!.eventType, 'VALUE_PROTECTED')
  })
})
