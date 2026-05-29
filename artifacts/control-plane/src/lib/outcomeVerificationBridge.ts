import { liveFetch } from './liveApi'
import { broadcastLiveReadRefresh } from './recommendationApprovalBridge'

export async function verifyExecutionOutcome(executionResultId: string) {
  const result = await liveFetch<any>(`/api/execution-results/${encodeURIComponent(executionResultId)}/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actorId: 'operator' }) })
  broadcastLiveReadRefresh()
  return result
}
