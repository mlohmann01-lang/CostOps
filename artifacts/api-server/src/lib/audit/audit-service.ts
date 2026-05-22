import { db, auditEventsTable } from '@workspace/db'
import type { AuditEventType, InsertAuditEvent } from '@workspace/db'
import { logger } from '../logger.js'

// Insert an audit event. Never throws — failures are logged but don't block the caller.
export async function recordAuditEvent(event: {
  tenantId: string
  actorId: string
  actorRole: string
  eventType: AuditEventType
  resourceType: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
  payload?: Record<string, unknown>
  outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED'
}): Promise<void> {
  try {
    const record: InsertAuditEvent = {
      tenantId: event.tenantId,
      actorId: event.actorId,
      actorRole: event.actorRole,
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.requestId,
      payload: event.payload ?? {},
      outcome: event.outcome ?? 'SUCCESS',
    }
    await db.insert(auditEventsTable).values(record)
  } catch (err) {
    logger.error({ err }, 'Audit event write failed')
    // Do NOT rethrow — audit failure must never block the operation
  }
}

export function recordPermissionDenied(
  tenantId: string,
  actorId: string,
  actorRole: string,
  permission: string,
  requestId?: string,
): Promise<void> {
  return recordAuditEvent({
    tenantId,
    actorId,
    actorRole,
    eventType: 'PERMISSION_DENIED',
    resourceType: 'permission',
    resourceId: permission,
    requestId,
    payload: { permission },
    outcome: 'BLOCKED',
  })
}

export function recordApprovalEvent(
  tenantId: string,
  actorId: string,
  actorRole: string,
  eventType: AuditEventType,
  approvalRequestId: number,
  reason?: string,
): Promise<void> {
  return recordAuditEvent({
    tenantId,
    actorId,
    actorRole,
    eventType,
    resourceType: 'approval_request',
    resourceId: String(approvalRequestId),
    payload: { approvalRequestId, ...(reason !== undefined ? { reason } : {}) },
    outcome: 'SUCCESS',
  })
}
