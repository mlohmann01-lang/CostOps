import type { GovernanceAction } from '../../types/governance'
import { getFlexeraSignal } from '../authority/flexera-authority-normalizer'
export function evidenceConfidenceScore(action: GovernanceAction): number { return action.verdict==='GOVERNED_EXECUTION_ELIGIBLE'?88:action.verdict==='APPROVAL_REQUIRED'?76:58 }
export function governanceConfidenceScore(action: GovernanceAction): number {
  const base = evidenceConfidenceScore(action)
  const authority = getFlexeraSignal(action.id)
  return authority?.adjustedConfidence ?? base
}
