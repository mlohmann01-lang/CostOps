import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const reconciliationFindingsTable = pgTable("reconciliation_findings", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  findingType: text("finding_type").notNull(),
  severity: text("severity").notNull(),
  entityType: text("entity_type").notNull(),
  entityKey: text("entity_key").notNull(),
  sourcesInvolved: jsonb("sources_involved").notNull().default([]),
  evidence: jsonb("evidence").notNull().default({}),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
