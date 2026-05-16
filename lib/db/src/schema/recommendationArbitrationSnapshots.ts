import { index, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const recommendationArbitrationSnapshotsTable = pgTable("recommendation_arbitration_snapshots", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  recommendationId: text("recommendation_id").notNull(),
  playbookId: text("playbook_id").notNull().default(""),
  connectorType: text("connector_type").notNull().default("m365"),
  priorityScore: real("priority_score").notNull().default(0),
  priorityBand: text("priority_band").notNull().default("LOW"),
  projectedSavingsScore: real("projected_savings_score").notNull().default(0),
  trustScore: real("trust_score").notNull().default(0),
  governanceRiskScore: real("governance_risk_score").notNull().default(0),
  blastRadiusScore: real("blast_radius_score").notNull().default(0),
  reversibilityScore: real("reversibility_score").notNull().default(0),
  realizationConfidenceScore: real("realization_confidence_score").notNull().default(0),
  driftRiskScore: real("drift_risk_score").notNull().default(0),
  reversalRiskScore: real("reversal_risk_score").notNull().default(0),
  urgencyScore: real("urgency_score").notNull().default(0),
  arbitrationReasons: jsonb("arbitration_reasons").notNull().default([]),
  suppressionReasons: jsonb("suppression_reasons").notNull().default([]),
  conflictGroupId: text("conflict_group_id"),
  deduplicationGroupId: text("deduplication_group_id"),
  arbitrationEngineVersion: text("arbitration_engine_version").notNull().default("recommendation-arbitration-v1"),
  deterministicHash: text("deterministic_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("recommendation_arbitration_tenant_idx").on(table.tenantId),
  index("recommendation_arbitration_recommendation_idx").on(table.recommendationId),
  index("recommendation_arbitration_priority_band_idx").on(table.priorityBand),
  index("recommendation_arbitration_created_at_idx").on(table.createdAt),
]);

export type RecommendationArbitrationSnapshot = typeof recommendationArbitrationSnapshotsTable.$inferSelect;
