import type { FlexeraAuthoritySignal } from './flexera-authority-types'
import { FLEXERA_SIGNALS } from './flexera-authority-fixtures'
export function getFlexeraSignal(recommendationId: string): FlexeraAuthoritySignal | undefined { return FLEXERA_SIGNALS.find((s) => s.recommendationId === recommendationId) }
