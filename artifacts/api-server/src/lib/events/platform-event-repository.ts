import { appendUnifiedEvent, listUnifiedEvents } from './evidence-timeline'
import type { UnifiedGovernanceEvent } from './types'
import type { PlatformEvent, PlatformEventCategory, PlatformEventFilters, PlatformEventSeverity } from './platform-event-types'

function categoryFromUnified(category: string | undefined, eventType = ''): PlatformEventCategory {
  const raw = String(category ?? '').toUpperCase()
  if (['TRUST', 'OPPORTUNITY', 'PRIORITY', 'APPROVAL', 'EXECUTION', 'OUTCOME', 'DRIFT', 'SYSTEM'].includes(raw)) return raw as PlatformEventCategory
  if (raw === 'RECOMMENDATION' || eventType.includes('RECOMMENDATION')) return 'PRIORITY'
  if (raw === 'EXECUTION_REQUEST' || raw === 'DRY_RUN') return 'EXECUTION'
  if (raw === 'DISCOVERY' || raw === 'POLICY' || raw === 'CAMPAIGN') return 'SYSTEM'
  if (eventType.startsWith('OPPORTUNITY_')) return 'OPPORTUNITY'
  if (eventType.startsWith('APPROVAL_')) return 'APPROVAL'
  if (eventType.startsWith('EXECUTION_')) return 'EXECUTION'
  if (eventType.startsWith('OUTCOME_')) return 'OUTCOME'
  if (eventType.startsWith('DRIFT_')) return 'DRIFT'
  if (eventType.startsWith('TRUST_')) return 'TRUST'
  if (eventType.startsWith('CONNECTOR_') || eventType.startsWith('RUNTIME_')) return 'SYSTEM'
  return 'SYSTEM'
}

function severityFromType(type: string): PlatformEventSeverity {
  if (type.includes('CRITICAL')) return 'CRITICAL'
  if (type.includes('FAILED') || type.includes('REJECTED') || type.includes('BLOCKED')) return 'ERROR'
  if (type.includes('DEGRADED') || type.includes('DRIFT') || type.includes('EXPIRED')) return 'WARNING'
  return 'INFO'
}

function title(type: string) { return type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) }

export function platformEventToUnified(event: PlatformEvent): UnifiedGovernanceEvent {
  return {
    eventId: event.eventId,
    tenantId: event.tenantId,
    entityType: event.entityType ?? event.category,
    entityId: event.entityId ?? event.eventId,
    eventType: event.type,
    eventCategory: event.category === 'PRIORITY' ? 'RECOMMENDATION' : event.category as any,
    actorId: event.actorId ?? 'system',
    actorRole: String(event.metadata?.actorRole ?? 'SYSTEM'),
    eventReason: event.description ?? event.title,
    beforeState: String(event.metadata?.beforeState ?? ''),
    afterState: String(event.metadata?.afterState ?? ''),
    evidenceSnapshot: { evidenceRef: event.evidenceRef, ...(event.metadata ?? {}) },
    sourceSystem: event.sourceSystem,
    createdAt: event.occurredAt,
  }
}

export function unifiedToPlatformEvent(event: UnifiedGovernanceEvent): PlatformEvent {
  const category = categoryFromUnified(event.eventCategory, event.eventType)
  const evidence = (event.evidenceSnapshot && typeof event.evidenceSnapshot === 'object') ? event.evidenceSnapshot as Record<string, unknown> : { evidenceSnapshot: event.evidenceSnapshot }
  return {
    eventId: event.eventId,
    tenantId: event.tenantId,
    category,
    type: event.eventType,
    severity: severityFromType(event.eventType),
    title: title(event.eventType),
    description: event.eventReason,
    actorId: event.actorId,
    entityType: event.entityType,
    entityId: event.entityId,
    sourceSystem: event.sourceSystem,
    evidenceRef: typeof evidence.evidenceRef === 'string' ? evidence.evidenceRef : undefined,
    metadata: { ...evidence, actorRole: event.actorRole, beforeState: event.beforeState, afterState: event.afterState },
    occurredAt: event.createdAt,
  }
}

export class PlatformEventRepository {
  async appendEvent(event: PlatformEvent) {
    const existing = listUnifiedEvents(event.tenantId).some((row) => row.eventId === event.eventId)
    if (existing) throw new Error(`PLATFORM_EVENT_IMMUTABLE_DUPLICATE:${event.eventId}`)
    appendUnifiedEvent(platformEventToUnified(event))
    return event
  }

  async appendEvents(events: PlatformEvent[]) {
    const out: PlatformEvent[] = []
    for (const event of events) out.push(await this.appendEvent(event))
    return out
  }

  async getEvent(tenantId: string, eventId: string) {
    return (await this.listEvents(tenantId, { limit: 1000 })).find((event) => event.eventId === eventId) ?? null
  }

  async listEvents(tenantId: string, filters: PlatformEventFilters = {}) {
    let events = listUnifiedEvents(tenantId).map(unifiedToPlatformEvent)
    if (filters.category) events = events.filter((event) => event.category === filters.category)
    if (filters.entityType) events = events.filter((event) => event.entityType === filters.entityType)
    if (filters.entityId) events = events.filter((event) => event.entityId === filters.entityId)
    if (filters.from) events = events.filter((event) => new Date(event.occurredAt).getTime() >= new Date(filters.from!).getTime())
    if (filters.to) events = events.filter((event) => new Date(event.occurredAt).getTime() <= new Date(filters.to!).getTime())
    return events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime() || a.eventId.localeCompare(b.eventId)).slice(0, Math.min(Math.max(filters.limit ?? 200, 1), 1000))
  }

  listByCategory(tenantId: string, category: PlatformEventCategory, limit = 200) { return this.listEvents(tenantId, { category, limit }) }
  listByEntity(tenantId: string, entityType: string, entityId: string, limit = 200) { return this.listEvents(tenantId, { entityType, entityId, limit }) }
  listByTimeRange(tenantId: string, from: string, to: string, limit = 200) { return this.listEvents(tenantId, { from, to, limit }) }
}
