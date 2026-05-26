import type { CommandViewRuntimeOptions } from '../commandViewData.js'
import type { CanonicalPlatformState, EvidenceLineage } from '../../types/platformSemantics.js'
import { loadDriftMonitorState, type DriftMonitorState } from '../driftMonitorData.js'
import { seededLineage, policyResultFromState } from '../semantics.js'

export interface DriftServiceResult {
  data: DriftMonitorState
  canonicalState: CanonicalPlatformState
  evidenceLineage: EvidenceLineage
  trustScore: number
  confidenceScore: number
  policyResult: EvidenceLineage['policyResult']
}

export async function driftService(runtime: CommandViewRuntimeOptions): Promise<DriftServiceResult> {
  const data = await loadDriftMonitorState(runtime)
  const active = data.summary.activeDriftEvents
  const trustScore = active === 0 ? 0.92 : active === 1 ? 0.72 : Math.max(0.3, 0.72 - (active - 1) * 0.1)
  const confidenceScore = data.summary.monitoredOutcomes > 0 ? 0.83 : 0.60
  const criticalEvents = data.events.filter(e => e.severity === 'CRITICAL')
  const canonicalState: CanonicalPlatformState =
    criticalEvents.length > 0 ? 'QUARANTINED' :
    active > 0 ? 'DRIFT_DETECTED' : 'VERIFIED'
  const policyResult = policyResultFromState(canonicalState)
  const base = seededLineage('drift')
  return {
    data,
    canonicalState,
    evidenceLineage: { ...base, trustScore, confidenceScore, policyResult },
    trustScore,
    confidenceScore,
    policyResult,
  }
}
