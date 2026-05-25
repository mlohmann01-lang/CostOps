import { getSession } from '../auth/session'

export function isDemoMode() {
  return getSession()?.tenantMode === 'DEMO'
}
export function blocksLiveExecution() {
  const s = getSession()
  return !s || !s.liveExecutionEnabled
}
