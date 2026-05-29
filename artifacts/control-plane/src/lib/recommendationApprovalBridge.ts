import { liveFetch } from './liveApi'

export type SubmitRecommendationApprovalResult = {
  recommendationId: string
  workflowId: string
  approvalState: string
  currentStage: string
  requiredRoles: string[]
  submittedAt: string
}

export async function submitRecommendationForApproval(recommendationId: string, body: { actorId?: string; actorRole?: string; reason?: string } = {}) {
  return liveFetch<SubmitRecommendationApprovalResult>(`/api/recommendations/${encodeURIComponent(recommendationId)}/submit-approval`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

export function broadcastLiveReadRefresh() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('certen:live-read-refresh'))
}
