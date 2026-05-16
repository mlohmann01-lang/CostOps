import { index, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const entityCorrelationSnapshotsTable = pgTable("entity_correlation_snapshots", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  entityId: text("entity_id").notNull(),
  correlationType: text("correlation_type").notNull(),
  correlatedEntityIds: jsonb("correlated_entity_ids").notNull().default([]),
  correlationConfidence: real("correlation_confidence").notNull().default(0),
  correlationReasoning: jsonb("correlation_reasoning").notNull().default([]),
  deterministicHash: text("deterministic_hash").notNull(),
  correlationEngineVersion: text("correlation_engine_version").notNull().default("entity-correlation-v1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("entity_correlation_snapshots_tenant_idx").on(t.tenantId)]);
