import { liveFetch } from './liveApi'
import { broadcastLiveReadRefresh } from './recommendationApprovalBridge'

export async function executeExecutionRequest(executionRequestId: string) {
  const result = await liveFetch<any>(`/api/execution-requests/${encodeURIComponent(executionRequestId)}/execute`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ executedBy: 'operator' }) })
  broadcastLiveReadRefresh()
  return result
}
