import { jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const connectorTrustSnapshotsTable = pgTable("connector_trust_snapshots", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  connectorType: text("connector_type").notNull(),
  connectorId: text("connector_id").notNull(),
  sourceSystem: text("source_system").notNull(),
  syncRunId: text("sync_run_id").notNull(),
  trustScore: numeric("trust_score", { precision: 5, scale: 2 }).notNull(),
  trustBand: text("trust_band").notNull(),
  freshnessScore: numeric("freshness_score", { precision: 5, scale: 2 }).notNull(),
  completenessScore: numeric("completeness_score", { precision: 5, scale: 2 }).notNull(),
  consistencyScore: numeric("consistency_score", { precision: 5, scale: 2 }).notNull(),
  identityMatchScore: numeric("identity_match_score", { precision: 5, scale: 2 }).notNull(),
  sourceReliabilityScore: numeric("source_reliability_score", { precision: 5, scale: 2 }).notNull(),
  criticalFindings: jsonb("critical_findings").$type<string[]>().notNull().default([]),
  warningFindings: jsonb("warning_findings").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
