import type { CommandViewRuntimeOptions, CommandViewState } from '../commandViewData.js'
import type { CanonicalPlatformState, EvidenceLineage } from '../../types/platformSemantics.js'
import { loadCommandViewState } from '../commandViewData.js'
import { seededLineage, policyResultFromState } from '../semantics.js'

export interface CommandServiceResult {
  data: CommandViewState
  canonicalState: CanonicalPlatformState
  evidenceLineage: EvidenceLineage
  trustScore: number
  confidenceScore: number
  policyResult: EvidenceLineage['policyResult']
}

export async function commandService(runtime: CommandViewRuntimeOptions): Promise<CommandServiceResult> {
  const data = await loadCommandViewState(runtime)
  const queue = data.actionQueue
  const rawAvg = queue.length > 0
    ? queue.reduce((s, a) => s + (a.trustScore ?? 0), 0) / queue.length
    : 50
  const trustScore = Math.round(rawAvg) / 100
  const confidenceScore = 0.87
  const canonicalState: CanonicalPlatformState =
    data.globalVerdict === 'GOVERNED_EXECUTION_ELIGIBLE' ? 'EXECUTION_ELIGIBLE' :
    data.globalVerdict === 'APPROVAL_REQUIRED' ? 'APPROVAL_REQUIRED' :
    data.globalVerdict === 'BLOCKED_DATA_TRUST' ? 'BLOCKED' :
    data.globalVerdict === 'DRIFT_DETECTED' ? 'DRIFT_DETECTED' :
    data.globalVerdict === 'DEMO_DATA_ONLY' ? 'UNDER_REVIEW' : 'GOVERNED'
  const policyResult = policyResultFromState(canonicalState)
  const base = seededLineage('command')
  return {
    data,
    canonicalState,
    evidenceLineage: { ...base, trustScore, confidenceScore, policyResult },
    trustScore,
    confidenceScore,
    policyResult,
  }
}
