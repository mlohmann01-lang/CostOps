import type { CommandViewRuntimeOptions } from '../commandViewData.js'
import type { CanonicalPlatformState, EvidenceLineage } from '../../types/platformSemantics.js'
import { loadGovernanceState, type GovernanceState } from '../governanceData.js'
import { seededLineage, policyResultFromState } from '../semantics.js'

export interface GovernanceServiceResult {
  data: GovernanceState
  canonicalState: CanonicalPlatformState
  evidenceLineage: EvidenceLineage
  trustScore: number
  confidenceScore: number
  policyResult: EvidenceLineage['policyResult']
}

export async function governanceService(runtime: CommandViewRuntimeOptions): Promise<GovernanceServiceResult> {
  const data = await loadGovernanceState(runtime)
  const rawAvg = data.summary.averageTrustScore ?? 75
  const trustScore = Math.round(rawAvg) / 100
  const confidenceScore = data.summary.policyWarnings > 0 ? 0.70 : 0.88
  const canonicalState: CanonicalPlatformState =
    data.summary.blockedActions > 0 ? 'BLOCKED' :
    data.summary.approvalsRequired > 0 ? 'APPROVAL_REQUIRED' : 'GOVERNED'
  const policyResult = policyResultFromState(canonicalState)
  const base = seededLineage('governance')
  return {
    data,
    canonicalState,
    evidenceLineage: { ...base, trustScore, confidenceScore, policyResult },
    trustScore,
    confidenceScore,
    policyResult,
  }
}
