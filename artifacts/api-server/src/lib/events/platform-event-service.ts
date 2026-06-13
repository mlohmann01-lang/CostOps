import { normalizeApprovalWorkflowEvent, normalizeRecommendationGovernanceEvent } from './event-normalizer'
import { PlatformEventRepository, unifiedToPlatformEvent } from './platform-event-repository'
import type { UnifiedGovernanceEvent } from './types'
import type { PlatformEvent, PlatformEventCategory, PlatformEventInput, PlatformEventSeverity } from './platform-event-types'
import { getPersistenceProvider, PersistenceStore } from '../persistence/persistence-provider'
import { PersistenceCollections } from '../persistence/persistence-collections'

const platformEventStore = new PersistenceStore<PlatformEvent & { id: string; tenantId: string; createdAt: string; updatedAt: string }>(getPersistenceProvider(), PersistenceCollections.PLATFORM_EVENTS)

const canonicalAliases: Record<string, string> = {
  APPROVAL_GRANTED: 'APPROVAL_APPROVED',
  APPROVAL_WORKFLOW_CREATED: 'APPROVAL_SUBMITTED',
  EXECUTION_REQUESTED: 'EXECUTION_REQUEST_CREATED',
  OUTCOME_VERIFIED: 'OUTCOME_PROOF_VERIFIED',
  OUTCOME_VERIFICATION_FAILED: 'OUTCOME_PROOF_FAILED',
  OUTCOME_FAILED: 'OUTCOME_PROOF_FAILED',
  RECOMMENDATION_SUBMITTED_FOR_APPROVAL: 'APPROVAL_SUBMITTED',
}

function canonicalType(type: string) { return canonicalAliases[type] ?? type }
function title(type: string) { return type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) }
function severity(type: string, explicit?: PlatformEventSeverity): PlatformEventSeverity {
  if (explicit) return explicit
  if (type.includes('CRITICAL')) return 'CRITICAL'
  if (type.includes('FAILED') || type.includes('REJECTED') || type.includes('BLOCKED')) return 'ERROR'
  if (type.includes('DEGRADED') || type.includes('DRIFT') || type.includes('EXPIRED')) return 'WARNING'
  return 'INFO'
}
function idFor(event: PlatformEvent) { return event.eventId || `${event.tenantId}:${event.category}:${event.type}:${event.entityType ?? 'event'}:${event.entityId ?? Date.now()}:${event.occurredAt}` }

export class PlatformEventService {
  constructor(private readonly repository = new PlatformEventRepository()) {}

  normalizeExternalEvent(input: any): PlatformEvent {
    if (input?.eventCategory || input?.eventType) return unifiedToPlatformEvent(input as UnifiedGovernanceEvent)
    if (input?.workflowId) return unifiedToPlatformEvent(normalizeApprovalWorkflowEvent(input))
    if (input?.recommendationId) return unifiedToPlatformEvent(normalizeRecommendationGovernanceEvent(input))
    const type = canonicalType(String(input?.type ?? input?.eventType ?? 'SYSTEM_EVENT'))
    const category = String(input?.category ?? 'SYSTEM').toUpperCase() as PlatformEventCategory
    const occurredAt = new Date(input?.occurredAt ?? input?.createdAt ?? input?.timestamp ?? Date.now()).toISOString()
    const event: PlatformEvent = { eventId: String(input?.eventId ?? input?.id ?? `${input?.tenantId ?? 'default'}:${category}:${type}:${occurredAt}`), tenantId: String(input?.tenantId ?? 'default'), category, type, severity: severity(type, input?.severity), title: String(input?.title ?? title(type)), description: input?.description ?? input?.message, actorId: input?.actorId, entityType: input?.entityType, entityId: input?.entityId, sourceSystem: String(input?.sourceSystem ?? input?.source ?? 'external'), evidenceRef: input?.evidenceRef, metadata: input?.metadata ?? input?.payload ?? {}, occurredAt }
    return event
  }

  async recordNormalizedEvent(input: any) {
    const event = this.normalizeExternalEvent(input)
    event.type = canonicalType(event.type)
    event.title = event.title || title(event.type)
    event.severity = severity(event.type, event.severity)
    return this.repository.appendEvent(event)
  }

  async recordEvent(input: PlatformEventInput & { tenantId: string; category: PlatformEventCategory; type: string }) {
    const type = canonicalType(input.type)
    const event: PlatformEvent = { eventId: input.eventId ?? '', tenantId: input.tenantId, category: input.category, type, severity: severity(type, input.severity), title: input.title ?? title(type), description: input.description, actorId: input.actorId, entityType: input.entityType, entityId: input.entityId, sourceSystem: input.sourceSystem ?? 'platform-event-authority', evidenceRef: input.evidenceRef, metadata: input.metadata, occurredAt: input.occurredAt ?? new Date().toISOString() }
    event.eventId = idFor(event)
    const result = await this.repository.appendEvent(event)
    const ts = event.occurredAt
    platformEventStore.upsert({ ...event, id: event.eventId, tenantId: event.tenantId, createdAt: ts, updatedAt: ts }).catch(() => {})
    return result
  }

  recordTrustEvent(tenantId: string, type: string, input: PlatformEventInput = {}) { return this.recordEvent({ ...input, tenantId, category: 'TRUST', type }) }
  recordOpportunityEvent(tenantId: string, type: string, input: PlatformEventInput = {}) { return this.recordEvent({ ...input, tenantId, category: 'OPPORTUNITY', type }) }
  recordApprovalEvent(tenantId: string, type: string, input: PlatformEventInput = {}) { return this.recordEvent({ ...input, tenantId, category: 'APPROVAL', type }) }
  recordExecutionEvent(tenantId: string, type: string, input: PlatformEventInput = {}) { return this.recordEvent({ ...input, tenantId, category: 'EXECUTION', type }) }
  recordOutcomeEvent(tenantId: string, type: string, input: PlatformEventInput = {}) { return this.recordEvent({ ...input, tenantId, category: 'OUTCOME', type }) }
  recordDriftEvent(tenantId: string, type: string, input: PlatformEventInput = {}) { return this.recordEvent({ ...input, tenantId, category: 'DRIFT', type }) }
  recordSystemEvent(tenantId: string, type: string, input: PlatformEventInput = {}) { return this.recordEvent({ ...input, tenantId, category: 'SYSTEM', type }) }

  getEvent(tenantId: string, eventId: string) { return this.repository.getEvent(tenantId, eventId) }
  listEvents(tenantId: string, filters: any = {}) { return this.repository.listEvents(tenantId, filters) }
  listByCategory(tenantId: string, category: PlatformEventCategory, limit?: number) { return this.repository.listByCategory(tenantId, category, limit) }
  listByEntity(tenantId: string, entityType: string, entityId: string, limit?: number) { return this.repository.listByEntity(tenantId, entityType, entityId, limit) }
  listByTimeRange(tenantId: string, from: string, to: string, limit?: number) { return this.repository.listByTimeRange(tenantId, from, to, limit) }
}

export const platformEventService = new PlatformEventService()
