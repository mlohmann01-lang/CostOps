import type { UnifiedGovernanceEvent } from './types';

export function normalizeApprovalWorkflowEvent(input:any): UnifiedGovernanceEvent {
  return { eventId:String(input.eventId ?? input.id ?? `${input.workflowId}:${input.eventType}:${input.at}`), tenantId:String(input.tenantId), entityType:'APPROVAL_WORKFLOW', entityId:String(input.workflowId), eventType:String(input.eventType), eventCategory:'APPROVAL', actorId:String(input.actorId ?? 'system'), actorRole:String(input.actorRole ?? 'SYSTEM'), eventReason:String(input.detail ?? input.eventReason ?? ''), beforeState:String(input.beforeState ?? ''), afterState:String(input.afterState ?? ''), evidenceSnapshot:input.evidenceSnapshot ?? {}, sourceSystem:'approval-workflow-engine', createdAt:new Date(input.at ?? input.createdAt ?? Date.now()).toISOString() };
}

export function normalizeRecommendationGovernanceEvent(input:any): UnifiedGovernanceEvent {
  return { eventId:String(input.id ?? `${input.recommendationId}:${input.eventType}:${input.createdAt}`), tenantId:String(input.tenantId), entityType:'RECOMMENDATION', entityId:String(input.recommendationId), eventType:String(input.eventType), eventCategory:'RECOMMENDATION', actorId:String(input.actorId ?? 'system'), actorRole:String(input.actorRole ?? 'SYSTEM'), eventReason:String(input.eventReason ?? ''), beforeState:String(input.beforeState ?? input.beforeReadiness ?? ''), afterState:String(input.afterState ?? input.afterReadiness ?? ''), evidenceSnapshot:input.evidenceSnapshot ?? {}, sourceSystem:'recommendation-governance', createdAt:new Date(input.createdAt ?? Date.now()).toISOString() };
}
