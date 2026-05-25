import type { GovernanceAction } from '../../types/governance'
import { getFlexeraSignal } from '../authority/flexera-authority-normalizer'
export function authorityCoverageScore(action: GovernanceAction): number { return getFlexeraSignal(action.id) ? 91 : 38 }
