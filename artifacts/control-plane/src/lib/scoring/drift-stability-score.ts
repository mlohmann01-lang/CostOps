import type { GovernanceAction } from '../../types/governance'
export function driftStabilityScore(action: GovernanceAction): number { return action.blastRadius==='LOW'?84:action.blastRadius==='MEDIUM'?63:42 }
