import { boolean, index, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const recommendationOutcomesTable = pgTable("recommendation_outcomes", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  recommendationId: text("recommendation_id").notNull(),
  recommendationRationaleId: text("recommendation_rationale_id").notNull().default(""),
  connectorType: text("connector_type").notNull().default("m365"),
  playbookId: text("playbook_id").notNull().default(""),
  outcomeStatus: text("outcome_status").notNull().default("PENDING"),
  projectedMonthlySavings: real("projected_monthly_savings").notNull().default(0),
  projectedAnnualizedSavings: real("projected_annualized_savings").notNull().default(0),
  realizedMonthlySavings: real("realized_monthly_savings").notNull().default(0),
  realizedAnnualizedSavings: real("realized_annualized_savings").notNull().default(0),
  realizationDelta: real("realization_delta").notNull().default(0),
  realizationDeltaPercent: real("realization_delta_percent").notNull().default(0),
  resolutionConfidence: text("resolution_confidence").notNull().default("LOW"),
  confidenceCalibration: text("confidence_calibration").notNull().default("CONFIDENCE_UNVERIFIED"),
  resolutionEvidence: jsonb("resolution_evidence").notNull().default({}),
  connectorEvidenceSnapshot: jsonb("connector_evidence_snapshot").notNull().default({}),
  outcomeLedgerReferences: jsonb("outcome_ledger_references").notNull().default([]),
  postResolutionLineage: jsonb("post_resolution_lineage").notNull().default({}),
  driftDetected: boolean("drift_detected").notNull().default(false),
  reversalDetected: boolean("reversal_detected").notNull().default(false),
  driftReason: text("drift_reason"),
  reversalReason: text("reversal_reason"),
  resolutionEngineVersion: text("resolution_engine_version").notNull().default("outcome-resolution-v1"),
  deterministicHash: text("deterministic_hash").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("recommendation_outcomes_tenant_recommendation_idx").on(table.tenantId, table.recommendationId),
  index("recommendation_outcomes_tenant_status_idx").on(table.tenantId, table.outcomeStatus),
  index("recommendation_outcomes_tenant_resolved_idx").on(table.tenantId, table.resolvedAt),
]);

export type RecommendationOutcome = typeof recommendationOutcomesTable.$inferSelect;
