import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const evidenceReconciliationFindingsTable = pgTable("evidence_reconciliation_findings", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  connectorType: text("connector_type").notNull(),
  sourceSystem: text("source_system").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  findingType: text("finding_type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("OPEN"),
  description: text("description").notNull(),
  evidenceSnapshot: jsonb("evidence_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  recommendedResolution: text("recommended_resolution").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
