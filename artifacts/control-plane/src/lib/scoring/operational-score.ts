import type { GovernanceAction } from '../../types/governance'
export function readinessScore(action: GovernanceAction): number { return action.verdict==='GOVERNED_EXECUTION_ELIGIBLE'?92:action.verdict==='APPROVAL_REQUIRED'?67:41 }
export function verificationMaturityScore(action: GovernanceAction): number { return action.verdict==='GOVERNED_EXECUTION_ELIGIBLE'?74:53 }
