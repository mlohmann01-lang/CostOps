export type PlatformEventCategory = 'TRUST' | 'OPPORTUNITY' | 'PRIORITY' | 'APPROVAL' | 'EXECUTION' | 'OUTCOME' | 'DRIFT' | 'SYSTEM'
export type PlatformEventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface PlatformEvent {
  eventId: string
  tenantId: string
  category: PlatformEventCategory
  type: string
  severity: PlatformEventSeverity
  title: string
  description?: string
  actorId?: string
  entityType?: string
  entityId?: string
  sourceSystem: string
  evidenceRef?: string
  metadata?: Record<string, unknown>
  occurredAt: string
}

export interface PlatformEventFilters {
  category?: PlatformEventCategory
  entityType?: string
  entityId?: string
  from?: string
  to?: string
  limit?: number
}

export type PlatformEventInput = Partial<Omit<PlatformEvent, 'eventId' | 'tenantId' | 'occurredAt' | 'severity' | 'sourceSystem' | 'title' | 'category' | 'type'>> & {
  eventId?: string
  tenantId?: string
  occurredAt?: string
  severity?: PlatformEventSeverity
  sourceSystem?: string
  title?: string
}
