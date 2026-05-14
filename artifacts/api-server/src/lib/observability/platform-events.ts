import { db, platformEventsTable } from "@workspace/db";

export async function emitPlatformEvent(e: {
  tenantId?: string;
  eventType: string;
  severity: string;
  source: string;
  correlationId: string;
  entityType?: string;
  entityId?: string;
  message: string;
  evidence?: Record<string, unknown>;
}) {
  try {
    await db.insert(platformEventsTable).values({
      tenantId: e.tenantId ?? null,
      eventType: e.eventType,
      severity: e.severity,
      source: e.source,
      correlationId: e.correlationId,
      entityType: e.entityType ?? null,
      entityId: e.entityId ?? null,
      message: e.message,
      evidence: e.evidence ?? {},
    });
  } catch (error) {
    console.warn("[platform-events] failed to persist event", {
      eventType: e.eventType,
      source: e.source,
      correlationId: e.correlationId,
      error,
    });
  }
}
