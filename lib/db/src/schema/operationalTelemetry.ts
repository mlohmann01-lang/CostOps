import { index, integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const operationalEventsTable = pgTable("operational_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category").notNull(),
  sourceSystem: text("source_system").notNull(),
  sourceComponent: text("source_component").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  eventSeverity: text("event_severity").notNull(),
  eventStatus: text("event_status").notNull(),
  eventMessage: text("event_message").notNull(),
  failureCategory: text("failure_category"),
  eventMetadata: jsonb("event_metadata").notNull().default({}),
  eventEvidence: jsonb("event_evidence").notNull().default({}),
  correlationId: text("correlation_id").notNull(),
  traceId: text("trace_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index("operational_events_tenant_idx").on(t.tenantId),
  categoryIdx: index("operational_events_category_idx").on(t.eventCategory),
  severityIdx: index("operational_events_severity_idx").on(t.eventSeverity),
  createdIdx: index("operational_events_created_idx").on(t.createdAt),
  correlationIdx: index("operational_events_correlation_idx").on(t.correlationId),
}));

export const connectorHealthSnapshotsTable = pgTable("connector_health_snapshots", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), connectorType: text("connector_type").notNull(),
  healthStatus: text("health_status").notNull(), availabilityScore: numeric("availability_score").notNull(), latencyScore: numeric("latency_score").notNull(), freshnessScore: numeric("freshness_score").notNull(), trustScore: numeric("trust_score").notNull(),
  rateLimitEvents: integer("rate_limit_events").notNull().default(0), retryEvents: integer("retry_events").notNull().default(0), failedRequests: integer("failed_requests").notNull().default(0),
  lastSuccessfulSync: timestamp("last_successful_sync", { withTimezone: true }), lastFailedSync: timestamp("last_failed_sync", { withTimezone: true }),
  healthReasoning: jsonb("health_reasoning").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const governanceActivityStreamTable = pgTable("governance_activity_stream", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), policyId: text("policy_id").notNull(), policyVersion: text("policy_version").notNull(), evaluationOutcome: text("evaluation_outcome").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(), evaluationLatencyMs: integer("evaluation_latency_ms").notNull(), simulationMode: text("simulation_mode").notNull().default("LIVE"), governanceMetadata: jsonb("governance_metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const operatorActivityEventsTable = pgTable("operator_activity_events", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), operatorId: text("operator_id").notNull(), activityType: text("activity_type").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(), activityMetadata: jsonb("activity_metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
