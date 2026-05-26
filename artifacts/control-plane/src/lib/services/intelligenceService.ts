import type { CommandViewRuntimeOptions } from '../commandViewData.js'
import type { CanonicalPlatformState, EvidenceLineage } from '../../types/platformSemantics.js'
import { loadIntelligenceState, type IntelligenceState } from '../intelligenceViewData.js'
import { seededLineage, policyResultFromState } from '../semantics.js'

export interface IntelligenceServiceResult {
  data: IntelligenceState
  canonicalState: CanonicalPlatformState
  evidenceLineage: EvidenceLineage
  trustScore: number
  confidenceScore: number
  policyResult: EvidenceLineage['policyResult']
}

export async function intelligenceService(runtime: CommandViewRuntimeOptions): Promise<IntelligenceServiceResult> {
  const data = await loadIntelligenceState(runtime)
  const trustScore = data.summary.confidence / 100
  const confidenceScore = data.summary.sourceCoverage / 100
  const canonicalState: CanonicalPlatformState = data.recommendations.length > 0 ? 'UNDER_REVIEW' : 'DISCOVERED'
  const policyResult = policyResultFromState(canonicalState)
  const base = seededLineage('intelligence')
  return {
    data,
    canonicalState,
    evidenceLineage: { ...base, trustScore, confidenceScore, policyResult },
    trustScore,
    confidenceScore,
    policyResult,
  }
}
