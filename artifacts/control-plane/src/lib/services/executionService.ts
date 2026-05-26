import type { CommandViewRuntimeOptions } from '../commandViewData.js'
import type { CanonicalPlatformState, EvidenceLineage } from '../../types/platformSemantics.js'
import { loadExecutionState, type ExecutionState } from '../executionData.js'
import { seededLineage, policyResultFromState } from '../semantics.js'

export interface ExecutionServiceResult {
  data: ExecutionState
  canonicalState: CanonicalPlatformState
  evidenceLineage: EvidenceLineage
  trustScore: number
  confidenceScore: number
  policyResult: EvidenceLineage['policyResult']
}

export async function executionService(runtime: CommandViewRuntimeOptions): Promise<ExecutionServiceResult> {
  const data = await loadExecutionState(runtime)
  const trustScore = data.summary.verified > 0 ? 0.91 : data.summary.failed > 0 ? 0.45 : 0.78
  const confidenceScore = data.summary.dryRunReady > 0 ? 0.85 : 0.65
  const canonicalState: CanonicalPlatformState =
    data.summary.failed > 0 ? 'BLOCKED' :
    data.summary.verified > 0 ? 'VERIFIED' :
    data.summary.executing > 0 ? 'EXECUTED' :
    data.summary.approvalPending > 0 ? 'APPROVAL_REQUIRED' :
    data.summary.dryRunReady > 0 ? 'EXECUTION_ELIGIBLE' : 'GOVERNED'
  const policyResult = policyResultFromState(canonicalState)
  const base = seededLineage('execution')
  return {
    data,
    canonicalState,
    evidenceLineage: { ...base, trustScore, confidenceScore, policyResult },
    trustScore,
    confidenceScore,
    policyResult,
  }
}
