import type { CommandViewRuntimeOptions } from '../commandViewData.js'
import type { CanonicalPlatformState, EvidenceLineage } from '../../types/platformSemantics.js'
import { loadConnectorHubState, type ConnectorHubState } from '../connectorHubData.js'
import { seededLineage, policyResultFromState } from '../semantics.js'

export interface ConnectorServiceResult {
  data: ConnectorHubState
  canonicalState: CanonicalPlatformState
  evidenceLineage: EvidenceLineage
  trustScore: number
  confidenceScore: number
  policyResult: EvidenceLineage['policyResult']
}

export async function connectorService(runtime: CommandViewRuntimeOptions): Promise<ConnectorServiceResult> {
  const data = await loadConnectorHubState(runtime)
  const total = data.summary.liveConnectors + data.summary.syntheticConnectors
  const trustScore = total > 0 ? Math.round((data.summary.healthy / total) * 100) / 100 : 0.5
  const confidenceScore = data.metadata.dataSource === 'DEMO_SEED' ? 0.88 : Math.max(trustScore, 0.1)
  const canonicalState: CanonicalPlatformState =
    data.summary.blocked > 0 ? 'BLOCKED' :
    data.summary.degraded > 0 ? 'UNDER_REVIEW' : 'GOVERNED'
  const policyResult = policyResultFromState(canonicalState)
  const base = seededLineage('connector')
  return {
    data,
    canonicalState,
    evidenceLineage: { ...base, trustScore, confidenceScore, policyResult },
    trustScore,
    confidenceScore,
    policyResult,
  }
}
