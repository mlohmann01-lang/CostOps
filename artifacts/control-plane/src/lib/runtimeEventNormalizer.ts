import type { RuntimeEvent, RuntimeEventCategory, RuntimeEventSeverity, RuntimeEventType } from '../types/runtimeEvents'

const categories: RuntimeEventCategory[] = ['TRUST', 'OPPORTUNITY', 'PRIORITY', 'RECOMMENDATION', 'APPROVAL', 'EXECUTION', 'OUTCOME', 'DRIFT', 'CONNECTOR', 'GOVERNANCE', 'AUDIT', 'SYSTEM']
const types: RuntimeEventType[] = [
  'TRUST_FINDING_CREATED', 'TRUST_TASK_CREATED', 'TRUST_TASK_STARTED', 'TRUST_TASK_RESOLVED', 'OPPORTUNITY_DISCOVERED', 'OPPORTUNITY_UPDATED', 'OPPORTUNITY_DEDUPLICATED', 'OPPORTUNITY_CLOSED', 'APPROVAL_APPROVED', 'APPROVAL_EXPIRED', 'EXECUTION_REQUEST_CREATED', 'OUTCOME_PROOF_PROJECTED', 'OUTCOME_PROOF_APPROVED', 'OUTCOME_PROOF_EXECUTED', 'OUTCOME_PROOF_VERIFIED', 'OUTCOME_PROOF_PROTECTED', 'OUTCOME_PROOF_DRIFTED', 'RUNTIME_DEGRADED', 'RUNTIME_RECOVERED',
  'RECOMMENDATION_CREATED', 'RECOMMENDATION_UPDATED', 'APPROVAL_SUBMITTED', 'APPROVAL_GRANTED', 'APPROVAL_REJECTED',
  'EXECUTION_REQUESTED', 'DRY_RUN_STARTED', 'DRY_RUN_COMPLETED', 'DRY_RUN_BLOCKED', 'EXECUTION_STARTED', 'EXECUTION_COMPLETED', 'EXECUTION_FAILED', 'OUTCOME_VERIFICATION_STARTED', 'OUTCOME_VERIFIED', 'OUTCOME_PARTIALLY_VERIFIED', 'OUTCOME_VERIFICATION_FAILED', 'OUTCOME_FAILED', 'DRIFT_DETECTED',
  'DRIFT_RESOLVED', 'DRIFT_ESCALATED', 'CONNECTOR_DEGRADED', 'CONNECTOR_RECOVERED', 'GOVERNANCE_POLICY_CHANGED', 'AUDIT_PACK_GENERATED', 'SYSTEM_HEALTH_CHANGED', 'SCHEDULE_CREATED', 'SCHEDULE_READY', 'SCHEDULE_BLOCKED', 'SCHEDULE_CANCELLED',
]
const severities: RuntimeEventSeverity[] = ['info', 'success', 'warning', 'error']

function value(input: any, keys: string[]) {
  for (const key of keys) {
    const candidate = input?.[key]
    if (candidate !== undefined && candidate !== null && candidate !== '') return candidate
  }
  return undefined
}

function upper(input: unknown) {
  return String(input ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase()
}

function textFrom(input: any, keys: string[]) {
  return keys.map((key) => input?.[key]).filter((candidate) => candidate !== undefined && candidate !== null).join(' ').toLowerCase()
}

function inferCategory(input: any): RuntimeEventCategory {
  const raw = upper(value(input, ['category', 'eventCategory', 'domain', 'source']))
  if (categories.includes(raw as RuntimeEventCategory)) return raw as RuntimeEventCategory
  const text = textFrom(input, ['type', 'eventType', 'action', 'title', 'summary', 'message', 'verdict', 'result'])
  if (text.includes('trust')) return 'TRUST'
  if (text.includes('opportunity')) return 'OPPORTUNITY'
  if (text.includes('priority')) return 'PRIORITY'
  if (text.includes('approval') || text.includes('cab')) return 'APPROVAL'
  if (text.includes('execution') || text.includes('rollback')) return 'EXECUTION'
  if (text.includes('outcome') || text.includes('verified')) return 'OUTCOME'
  if (text.includes('drift')) return 'DRIFT'
  if (text.includes('connector') || text.includes('sync')) return 'CONNECTOR'
  if (text.includes('audit') || text.includes('cert') || text.includes('evidence')) return 'AUDIT'
  if (text.includes('policy') || text.includes('governance')) return 'GOVERNANCE'
  return 'SYSTEM'
}

function inferType(input: any, category: RuntimeEventCategory): RuntimeEventType {
  const raw = upper(value(input, ['type', 'eventType', 'name']))
  if (types.includes(raw as RuntimeEventType)) return raw as RuntimeEventType
  const text = textFrom(input, ['action', 'title', 'summary', 'message', 'result', 'verdict'])
  if (text.includes('rejected')) return 'APPROVAL_REJECTED'
  if (text.includes('submitted')) return 'APPROVAL_SUBMITTED'
  if (text.includes('approved') || text.includes('approval granted')) return 'APPROVAL_GRANTED'
  if (text.includes('dry run') && (text.includes('blocked') || text.includes('requires review'))) return 'DRY_RUN_BLOCKED'
  if (text.includes('dry run') && text.includes('completed')) return 'DRY_RUN_COMPLETED'
  if (text.includes('dry run') && text.includes('started')) return 'DRY_RUN_STARTED'
  if (text.includes('execution') && text.includes('failed')) return 'EXECUTION_FAILED'
  if (text.includes('execution') && (text.includes('completed') || text.includes('simulated'))) return 'EXECUTION_COMPLETED'
  if (text.includes('executing') || text.includes('started')) return 'EXECUTION_STARTED'
  if (text.includes('outcome') && text.includes('started')) return 'OUTCOME_VERIFICATION_STARTED'
  if (text.includes('outcome') && text.includes('partial')) return 'OUTCOME_PARTIALLY_VERIFIED'
  if (text.includes('outcome') && (text.includes('failed') || text.includes('verification failed'))) return 'OUTCOME_FAILED'
  if (text.includes('outcome') || text.includes('verified')) return 'OUTCOME_VERIFIED'
  if (text.includes('drift') && text.includes('resolved')) return 'DRIFT_RESOLVED'
  if (text.includes('drift')) return 'DRIFT_DETECTED'
  if (text.includes('degraded')) return 'CONNECTOR_DEGRADED'
  if (text.includes('recovered') || text.includes('ready')) return 'CONNECTOR_RECOVERED'
  if (text.includes('audit') || text.includes('pack')) return 'AUDIT_PACK_GENERATED'
  if (text.includes('policy')) return 'GOVERNANCE_POLICY_CHANGED'
  if (category === 'TRUST') return 'TRUST_TASK_CREATED'
  if (category === 'OPPORTUNITY') return 'OPPORTUNITY_UPDATED'
  if (category === 'PRIORITY') return 'RECOMMENDATION_UPDATED'
  if (category === 'RECOMMENDATION') return 'RECOMMENDATION_UPDATED'
  if (category === 'APPROVAL') return 'APPROVAL_SUBMITTED'
  if (category === 'EXECUTION') return 'EXECUTION_REQUESTED'
  if (category === 'OUTCOME') return 'OUTCOME_VERIFIED'
  if (category === 'DRIFT') return 'DRIFT_DETECTED'
  if (category === 'CONNECTOR') return 'CONNECTOR_DEGRADED'
  if (category === 'GOVERNANCE') return 'GOVERNANCE_POLICY_CHANGED'
  if (category === 'AUDIT') return 'AUDIT_PACK_GENERATED'
  return 'SYSTEM_HEALTH_CHANGED'
}

function inferSeverity(input: any, type: RuntimeEventType): RuntimeEventSeverity {
  const raw = String(value(input, ['severity', 'level', 'tone']) ?? '').toLowerCase()
  if (severities.includes(raw as RuntimeEventSeverity)) return raw as RuntimeEventSeverity
  if (type.endsWith('FAILED') || type === 'OUTCOME_FAILED' || type === 'OUTCOME_VERIFICATION_FAILED' || type === 'DRY_RUN_BLOCKED' || type === 'CONNECTOR_DEGRADED') return 'error'
  if (type === 'DRIFT_DETECTED') return 'warning'
  if (type.endsWith('COMPLETED') || type.endsWith('VERIFIED') || type.endsWith('GRANTED') || type.endsWith('RECOVERED') || type.endsWith('RESOLVED')) return 'success'
  return 'info'
}

function stableId(input: any) {
  return String(value(input, ['eventId', 'id', 'auditId', 'certId']) ?? `runtime-${Date.now()}-${Math.random().toString(36).slice(2)}`)
}

export function normalizeRuntimeEvent(input: unknown, defaults: { tenantId?: string } = {}): RuntimeEvent {
  const row = (input && typeof input === 'object') ? input as any : {}
  const category = inferCategory(row)
  const type = inferType(row, category)
  const message = String(value(row, ['message', 'summary', 'title', 'description', 'action', 'event']) ?? type.replace(/_/g, ' ').toLowerCase())
  const createdAt = String(value(row, ['occurredAt', 'createdAt', 'timestamp', 'at', 'time']) ?? new Date(0).toISOString())
  return {
    eventId: stableId(row),
    tenantId: String(value(row, ['tenantId', 'tenant_id']) ?? defaults.tenantId ?? 'unknown'),
    category,
    type,
    entityType: String(value(row, ['entityType', 'resourceType', 'source']) ?? category.toLowerCase()),
    entityId: String(value(row, ['entityId', 'resourceId', 'recommendationId', 'certId', 'id']) ?? stableId(row)),
    message,
    severity: inferSeverity(row, type),
    createdAt,
    actorId: value(row, ['actorId', 'actor', 'userId']) ? String(value(row, ['actorId', 'actor', 'userId'])) : undefined,
    actorLabel: value(row, ['actorLabel', 'actorName', 'approver']) ? String(value(row, ['actorLabel', 'actorName', 'approver'])) : undefined,
    payload: row,
  }
}

export function normalizeRuntimeEvents(input: unknown, defaults: { tenantId?: string } = {}): RuntimeEvent[] {
  const rows = Array.isArray(input) ? input : Array.isArray((input as any)?.events) ? (input as any).events : Array.isArray((input as any)?.timeline) ? (input as any).timeline : Array.isArray((input as any)?.data) ? (input as any).data : []
  return rows.map((row: unknown) => normalizeRuntimeEvent(row, defaults))
}
