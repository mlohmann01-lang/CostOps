import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const recommendationDecisionTracesTable = pgTable("recommendation_decision_traces", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  recommendationId: text("recommendation_id").notNull(),
  recommendationRationaleId: text("recommendation_rationale_id").notNull(),
  stage: text("stage").notNull(),
  stageOrder: text("stage_order").notNull(),
  outcome: text("outcome").notNull(),
  reason: text("reason").notNull().default(""),
  blocking: text("blocking").notNull().default("false"),
  warning: text("warning").notNull().default("false"),
  sourceEvidenceIds: jsonb("source_evidence_ids").notNull().default([]),
  connectorTrustSnapshotId: text("connector_trust_snapshot_id").notNull().default(""),
  reconciliationFindingIds: jsonb("reconciliation_finding_ids").notNull().default([]),
  decisionEngineVersion: text("decision_engine_version").notNull().default("decision-engine-v1"),
  traceHash: text("trace_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("recommendation_decision_traces_tenant_stage_idx").on(table.tenantId, table.recommendationId, table.stageOrder),
  index("recommendation_decision_traces_rationale_idx").on(table.tenantId, table.recommendationRationaleId),
]);

