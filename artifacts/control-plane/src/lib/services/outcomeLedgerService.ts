import type { CommandViewRuntimeOptions } from '../commandViewData.js'
import type { CanonicalPlatformState, EvidenceLineage } from '../../types/platformSemantics.js'
import { loadOutcomeLedgerState, type OutcomeLedgerState } from '../outcomeLedgerData.js'
import { seededLineage, policyResultFromState } from '../semantics.js'

export interface OutcomeLedgerServiceResult {
  data: OutcomeLedgerState
  canonicalState: CanonicalPlatformState
  evidenceLineage: EvidenceLineage
  trustScore: number
  confidenceScore: number
  policyResult: EvidenceLineage['policyResult']
}

export async function outcomeLedgerService(runtime: CommandViewRuntimeOptions): Promise<OutcomeLedgerServiceResult> {
  const data = await loadOutcomeLedgerState(runtime)
  const verified = data.summary.verifiedMonthlySavings
  const projected = data.summary.projectedMonthlySavings
  const trustScore = projected > 0 ? Math.min(verified / projected, 1) : 0.5
  const confidenceScore = data.summary.savingsConfidence === 'HIGH' ? 0.92
    : data.summary.savingsConfidence === 'SYNTHETIC_MEDIUM' ? 0.75
    : 0.55
  const drifted = data.outcomes.some(o => o.driftStatus && o.driftStatus !== 'NONE')
  const canonicalState: CanonicalPlatformState =
    drifted ? 'DRIFT_DETECTED' :
    data.summary.verificationPending > 0 ? 'EXECUTED' :
    data.summary.verifiedMonthlySavings > 0 ? 'VERIFIED' : 'GOVERNED'
  const policyResult = policyResultFromState(canonicalState)
  const base = seededLineage('outcome-ledger')
  return {
    data,
    canonicalState,
    evidenceLineage: { ...base, trustScore, confidenceScore, policyResult },
    trustScore,
    confidenceScore,
    policyResult,
  }
}
