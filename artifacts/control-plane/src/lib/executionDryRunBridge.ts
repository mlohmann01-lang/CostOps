import { liveFetch } from './liveApi'
import { broadcastLiveReadRefresh } from './recommendationApprovalBridge'

export async function runExecutionRequestDryRun(executionRequestId: string) {
  const result = await liveFetch<any>(`/api/execution-requests/${encodeURIComponent(executionRequestId)}/dry-run`, { method: 'POST', headers: { 'content-type': 'application/json' } })
  broadcastLiveReadRefresh()
  return result
}
