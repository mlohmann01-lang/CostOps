import { pgTable, bigserial, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod/v4'

// Event types that can appear in the audit trail
export const AUDIT_EVENT_TYPES = [
  // Auth events
  'AUTH_LOGIN',
  'AUTH_LOGOUT',
  'AUTH_FAILED',
  'AUTH_TOKEN_VALIDATED',
  // Approval events
  'APPROVAL_REQUESTED',
  'APPROVAL_GRANTED',
  'APPROVAL_REJECTED',
  'APPROVAL_EXPIRED',
  'APPROVAL_SELF_BLOCKED',
  // Execution events
  'EXECUTION_REQUESTED',
  'EXECUTION_STARTED',
  'EXECUTION_COMPLETED',
  'EXECUTION_FAILED',
  'EXECUTION_ROLLBACK_REQUESTED',
  'EXECUTION_ROLLBACK_COMPLETED',
  // Configuration events
  'TENANT_CONFIG_CHANGED',
  'PACK_ENABLED',
  'PACK_DISABLED',
  // Governance events
  'DRIFT_DETECTED',
  'DRIFT_ACKNOWLEDGED',
  'VERIFICATION_RUN',
  'VERIFICATION_PASSED',
  'VERIFICATION_FAILED',
  'OUTCOME_VERIFIED',
  'OUTCOME_PARTIALLY_VERIFIED',
  'OUTCOME_VERIFICATION_FAILED',
  'POLICY_REEVALUATED',
  'APPROVAL_EXPIRED',
  'DRY_RUN_EXPIRED',
  'CONNECTOR_DEGRADED',
  'EXECUTION_REQUEST_STALE',
  'RECOMMENDATION_STALE',
  // Security events
  'PERMISSION_DENIED',
  'TENANT_ISOLATION_VIOLATION_ATTEMPT',
  'SUSPICIOUS_ACTIVITY_DETECTED',
] as const

export type AuditEventType = typeof AUDIT_EVENT_TYPES[number]

export const auditEventsTable = pgTable('audit_events', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: text('tenant_id').notNull(),
  actorId: text('actor_id').notNull(),
  actorRole: text('actor_role').notNull().default('VIEWER'),
  eventType: text('event_type').notNull(),
  resourceType: text('resource_type').notNull().default('unknown'),
  resourceId: text('resource_id'),
  ipAddress: text('ip_address'),        // client IP
  userAgent: text('user_agent'),        // client User-Agent
  requestId: text('request_id'),        // pino request ID for correlation
  payload: jsonb('payload').notNull().default({}),  // event-specific data
  outcome: text('outcome').notNull().default('SUCCESS'),  // SUCCESS | FAILURE | BLOCKED
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Program 14B-R: tamper-evidence hash chain. prevHash links to the previous
  // event's tamperHash for the same tenant (or '' for the first event);
  // tamperHash = sha256(prevHash + JSON.stringify(deterministic event fields)).
  // Any mutation to a stored row's fields, or reordering of the chain,
  // changes the corresponding hash and is therefore detectable.
  prevHash: text('prev_hash').notNull().default(''),
  tamperHash: text('tamper_hash').notNull().default(''),
  // NOTE: No updatedAt — this table is intentionally immutable
})

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({ id: true, createdAt: true })
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>
